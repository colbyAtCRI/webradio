#pragma once
#include <libwebsockets.h>
#include <vector>
#include <string>
#include <map>
#include <iostream>

using namespace std;

class  WebSocketCustomer;
class  WebSocketServer;

WebSocketServer *getServer();

typedef void (WebSocketCustomer::*Action)(void);

// My websocket server that contains a list of non-ws devices to service
// as well as serving web pages and web sockets. These will be added by
// the hardware specific Radio subclass.

class Device
{
protected:
  WebSocketCustomer *mCustomer;
  Action             mOnInput;
  lws_pollfd         mPollfd;
public:
   Device(WebSocketCustomer *customer, Action act);
  ~Device() {
    // thinking about it
  }
   lws_pollfd  *devicePollfd() {
     return &mPollfd;
   }
   bool dataReady() {
     return (mPollfd.revents & mPollfd.events) != 0;
   }
   int  device() { return mPollfd.fd; }
   void processInput();
};


class WebSocketChannel
{
  lws               *mWsi;
  lws_write_protocol mWriteProtocol;
  uint8_t           *mBuffer;
  size_t             mLen;
  size_t             mCap;
public:
   WebSocketChannel(lws *wsi,lws_write_protocol prt);
  ~WebSocketChannel();
  void     write(string str);
  void     write(uint8_t *buf, size_t len);
  void     doWritable();
  string   myName() { return lws_get_protocol(mWsi)->name; }
  int      myFd() { return lws_get_socket_fd(mWsi); }
  uint8_t *begin() { return mBuffer+LWS_PRE; }
  size_t   size() { return mLen; }
};

class WebSocketServer;

// In general hardware devices will need to register serviable websockets
// with associated protocols. This is done with this interface. Note there
// is a one-on-one with the LWS_CALLBACK_X thingies.
class WebSocketCustomer
{
protected:
  WebSocketServer      *mServer;
  // List of this customer's protocols.
  vector<lws_protocols> mProtocols;
public:
  WebSocketCustomer(WebSocketServer *srv);
  ~WebSocketCustomer();

  // LWS_CALLBACK_PROTOCOL_INIT
  virtual bool protocolInit(lws *ws) { return true; }

  // LWS_CALLBACK_ESTABLISHED
  virtual void established(lws *ws) { }

  // LWS_CALLBACK_RECEIVE
  virtual void processInput(lws *ws, void *in, size_t len) {}

  // LWS_CALLBACK_CLOSED
  virtual void closeConnection(lws *ws) {}

  // LWS_CALLBACK_SERVER_WRITEABLE
  virtual void processOutput(lws *ws) {}

  WebSocketServer      *server() { return mServer; }
  vector<lws_protocols> protocols() { return mProtocols; }
  string                getProtocol(lws *wsi)
  {
    return string(lws_get_protocol(wsi)->name);
  }
  void                  addChannelProtocol(string name, lws_write_protocol prot);
  WebSocketChannel     *makeChannel(lws *wsi, lws_write_protocol prot);
};

class WebSocketServer
{
  // path from which we serve files from
  string                     mOrigin;
  // Server port number
  int                        mPort;
  // Mount point structure
  lws_http_mount             mMount;
  lws_context               *mContext;
  lws_context_creation_info  mInfo;
  // Various lists to be filled out by customers when adding
  // customers to the servers customer list prior to starting
  // the server. list of all protocols (channel names)
  vector<lws_protocols>      mProtocols;
  vector<Device*>            mDevice;
  vector<WebSocketCustomer*> mCustomer;
  // Dynamic list of all active channels opened by the web page UI(s)
  map<int,WebSocketChannel*> mChannels;
  // A c-style array constructed from the list of lws_protocols.
  lws_protocols             *mProt;
  void configure();
public:
   WebSocketServer(string origin,int port);
  ~WebSocketServer();
  void add(Device *dev);
  void add(WebSocketCustomer *customer);
  void add(WebSocketChannel *channel);
  void remove(lws *wsi);
  WebSocketChannel *getChannel(lws *wsi);
  void run();
  void log(string msg) { cout << msg << endl; }
  void sendAllChannels(string chan, string data);
  void sendAllChannels(string chan, uint8_t *buffer, size_t len);
};

int webserver_callback(lws *wsi,
                       lws_callback_reasons reason,
                       void *usr,
                       void *in,
                       size_t len);
