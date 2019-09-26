#pragma once
#include "control.h"
#include <libwebsockets.h>
#include <vector>
#include <string>
#include <iostream>

using namespace std;

// Our WebSocketServer maintains an SDRPlay radio and it's IQ streaming.
// We define 3 protocols, 'control', 'spectrum', 'channel'. Basically,
// control accepts.
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
  RadioControl               mControl;
  void configure();
public:
   WebSocketServer(string origin, int port);
  ~WebSocketServer();
  void add(lws_protocols prot);
  void run();
  void log(string msg) { cout << msg << endl; }
};

int webserver_callback(lws *wsi,
                       lws_callback_reasons reason,
                       void *usr,
                       void *in,
                       size_t len);
