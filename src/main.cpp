#include "sdrplay.h"
#include "webserver.h"
#include <iostream>
using namespace std;

#define checkAPI(x) {mir_sdr_ErrT e; if ((e = (x))) cout << #x << ": " << (int)e << endl;}
int
main(int argc, char *argv[])
{
  WebSocketServer server("/Users/paulcolby/Projects/webradio/html",8000);
  server.run();
  return 0;
}
