#include "webserver.h"
#include <signal.h>
#include <iostream>

static int interrupted(0);

void sigint_handler(int sig)
{
  interrupted = 1;
  cout << "Server interrupted : " << sig << endl;
}

Device::Device(WebSocketCustomer *customer, Action act)
  : mCustomer(customer), mOnInput(act)
{
  // These fields aren't known until one constructs the Device
  // inside the subclass constructor. Well set them there or
  // suffer the consequences.
  mPollfd.fd      = -1;
  mPollfd.events  = 0;
  mPollfd.revents = 0;
}

//Called by WebSocketServer::run() so customer can act on it's device
void Device::processInput()
{
  (mCustomer->*mOnInput)();
}

WebSocketChannel::WebSocketChannel(lws *wsi, lws_write_protocol prt)
  : mWsi(wsi), mWriteProtocol(prt)
{
  mBuffer = NULL;
  mLen    = 0;
  mCap    = 0;
}

WebSocketChannel::~WebSocketChannel()
{
  if (mBuffer)
    delete mBuffer;
}

void WebSocketChannel::write(string str)
{
  if (LWS_PRE+str.size() > mCap) {
    if (mBuffer)
      delete(mBuffer);
    mCap = LWS_PRE+str.size();
    mBuffer = new uint8_t[mCap];
  }
  mLen = str.size();
  copy(str.c_str(),str.c_str()+mLen,mBuffer+LWS_PRE);
  lws_callback_on_writable(mWsi);
}

void WebSocketChannel::write(uint8_t *buf,size_t len)
{
  if (LWS_PRE+len > mCap) {
    if (mBuffer)
      delete(mBuffer);
    mCap = LWS_PRE+len;
    mBuffer = new uint8_t[mCap];
  }
  mLen = len;
  copy(buf,buf+mLen,mBuffer+LWS_PRE);
  lws_callback_on_writable(mWsi);
}

void WebSocketChannel::doWritable()
{
  lws_write(mWsi,mBuffer+LWS_PRE,mLen,mWriteProtocol);
}

WebSocketCustomer::WebSocketCustomer(WebSocketServer *srv) : mServer(srv)
{

}

WebSocketCustomer::~WebSocketCustomer()
{

}

int webserver_callback(lws *wsi,
                       lws_callback_reasons reason,
                       void *usr,
                       void *in,
                       size_t len)
{
  // One sets the user pointer to the WebSocketCustomer handling the IO.
  // This way multiple customers may be served. This setting happens in
  // the customers constructor when it fills in it's protocol list.
  WebSocketCustomer *radio = (WebSocketCustomer*)lws_get_protocol(wsi)->user;
  switch (reason) {
    case LWS_CALLBACK_PROTOCOL_INIT:
      cout << "LWS_CALLBACK_PROTOCOL_INIT : " << radio->getProtocol(wsi) << endl;
      radio->protocolInit(wsi);
      break;
    case LWS_CALLBACK_ESTABLISHED:
      cout << "LWS_CALLBACK_ESTABLISHED : " << radio->getProtocol(wsi) << endl;
      radio->established(wsi);
      break;
    case LWS_CALLBACK_CLOSED:
      cout << "LWS_CALLBACK_CLOSED : " << radio->getProtocol(wsi) << endl;
      radio->closeConnection(wsi);
      break;
    case LWS_CALLBACK_SERVER_WRITEABLE:
      cout << "LWS_CALLBACK_SERVER_WRITEABLE : " << radio->getProtocol(wsi) << endl;
      radio->processOutput(wsi);
      break;
    case LWS_CALLBACK_RECEIVE:
      cout << "LWS_CALLBACK_RECEIVE : " << radio->getProtocol(wsi) << endl;
      radio->processInput(wsi,in,len);
      break;
    default:
      break;
  }
  return 0;
}

void WebSocketServer::add(WebSocketChannel *chn)
{
  mChannels[chn->myFd()] = chn;
}

void WebSocketServer::remove(lws *wsi)
{
  WebSocketChannel *chn = getChannel(wsi);
  mChannels.erase(chn->myFd());
  delete chn;
}

WebSocketChannel *WebSocketCustomer::makeChannel(lws *wsi, lws_write_protocol prot)
{
  WebSocketChannel *channel = new WebSocketChannel(wsi,LWS_WRITE_TEXT);
  server()->add(channel);
  return channel;
}

WebSocketChannel *WebSocketServer::getChannel(lws *wsi)
{
  return mChannels[lws_get_socket_fd(wsi)];
}

WebSocketServer::WebSocketServer(string origin,int port)
  : mOrigin(origin),
    mPort(port)
{
}

void WebSocketServer::configure()
{
  int log = LLL_USER | LLL_ERR | LLL_WARN | LLL_NOTICE;
  lws_set_log_level(log,NULL);
  static lws_protocols http = {"http",lws_callback_http_dummy,0,0,0,NULL,0};
  static lws_protocols endp = {NULL,NULL,0,0,0,NULL,0};

  int NP(mProtocols.size());
  mProt = new lws_protocols[NP+2];
  mProt[0] = http;
  copy(mProtocols.begin(),mProtocols.end(),&mProt[1]);
  mProt[NP+1] = endp;

  // Establish mount points
  mMount.mount_next            = NULL;
  mMount.mountpoint            = "/";
  mMount.origin                = mOrigin.c_str();
  mMount.def                   = "index.html";
  mMount.protocol              = NULL;
  mMount.cgienv                = NULL;
  mMount.extra_mimetypes       = NULL;
  mMount.interpret             = NULL;
  mMount.cgi_timeout           = 0,
  mMount.cache_max_age         = 0;
  mMount.auth_mask             = 0;
  mMount.cache_reusable        = 0;
  mMount.cache_revalidate      = 0;
  mMount.cache_intermediaries  = 0;
  mMount.origin_protocol       = LWSMPRO_FILE;
  mMount.mountpoint_len        = 1;
  mMount.basic_auth_login_file = NULL;

  char *mem = (char*)&mInfo;
  fill(mem,mem+sizeof(mInfo),0x00);

  mInfo.port      =  mPort;
  mInfo.mounts    = &mMount;
  mInfo.protocols =  mProt;

  mContext = lws_create_context(&mInfo);

  // Add all radio stray non-websocket devices to serve AFTER
  // the server context is constructed. Doing so before very
  // very bad in a segfaulty way. Historical note; this is the
  // first know use paul has made of the foreach construct in
  // c++-11. He likes it, a lot.
  for (auto dev : mDevice)
    lws_service_fd(mContext,dev->devicePollfd());

  signal(SIGINT,sigint_handler);
}

WebSocketServer::~WebSocketServer()
{

}

void WebSocketServer::add(Device *dev)
{
  mDevice.push_back(dev);
}

void WebSocketServer::add(WebSocketCustomer *customer)
{
  // Transfer all lws_protocols prior to constructing
  // the server context struct.
  vector<lws_protocols> prots = customer->protocols();
  for (auto p : prots)
    mProtocols.push_back(p);
  // Add the customer to the servers customer list.
  mCustomer.push_back(customer);
}

void WebSocketServer::run()
{
  int nerr(0);
  configure();
  while (nerr >= 0 && !interrupted) {
    // Do all the websocket servicing
    nerr = lws_service(mContext,1000);
    // For radio hardware it is typical for IQ data to be collected in
    // frames in a collection thread or by monitoring data on USB devices.
    // which are not websockets. A Radio class will register these file
    // descriptors using add(Device *). Here we process pending input
    // using Device specific processInput() calls.
    for (auto dev : mDevice)
      if (dev->dataReady())
        dev->processInput();
  }
  if (interrupted && nerr == 0)
    cout << "Server Interrupted Gracefully" << endl;

  if (nerr > 0)
    cout << "Server Due to Error : " << nerr << endl;
}

void WebSocketServer::sendAllChannels(string name, string data)
{
  for (auto chn = mChannels.begin(); chn != mChannels.end(); chn++) {
    if (chn->second->myName() == name)
      chn->second->write(data);
  }
}

void WebSocketServer::sendAllChannels(string name, uint8_t *buffer, size_t len)
{
  for (auto chn = mChannels.begin(); chn != mChannels.end(); chn++) {
    if (chn->second->myName() == name)
      chn->second->write(buffer,len);
  }
}
