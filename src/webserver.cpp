#include "webserver.h"
#include "control.h"
#include <signal.h>
#include <iostream>

static int interrupted(0);

void sigint_handler(int sig)
{
  interrupted = 1;
  cout << "Server interrupted : " << sig << endl;
}

// Basic protocol to serve index.html file on connection with the server.
// index.html will then make all subsequent ws connections and display the
// radio UI.
const lws_protocols HTTPProtocol = {
  "http",
  lws_callback_http_dummy,
  0,
  0,
  0,
  NULL,
  0
};

// Used as a protocol list terminator sentinal.
const lws_protocols EndProtocol = {
  NULL,
  NULL,
  0,
  0,
  0,
  NULL,
  0
};

WebSocketServer::WebSocketServer(string origin,int port)
  : mOrigin(origin),
    mPort(port),
    mControl()
{
  // establish all protocols
  mProtocols.push_back(HTTPProtocol);
  mProtocols.push_back(mControl.protocol());
  mProtocols.push_back(EndProtocol);
}

void WebSocketServer::configure()
{
  int log = LLL_USER | LLL_ERR | LLL_WARN | LLL_NOTICE;
  lws_set_log_level(log,NULL);

  /*
  int NP(mProtocols.size());
  mProt = new lws_protocols[NP+2];
  mProt[0] = http;
  copy(mProtocols.begin(),mProtocols.end(),&mProt[1]);
  mProt[NP+1] = endp;
  */

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
  mInfo.protocols = &mProtocols[0];

  mContext = lws_create_context(&mInfo);

  signal(SIGINT,sigint_handler);
}

WebSocketServer::~WebSocketServer()
{
}

void WebSocketServer::run()
{
  int nerr(0);
  configure();
  while (nerr >= 0 && !interrupted) {
    // Do all the websocket servicing
    nerr = lws_service(mContext,1000);
  }
  if (interrupted && nerr == 0)
    cout << "Server Interrupted Gracefully" << endl;

  if (nerr > 0)
    cout << "Server Due to Error : " << nerr << endl;
}
