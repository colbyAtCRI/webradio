#include "sdrplay.h"
#include "webserver.h"
#include <iostream>
using namespace std;

#define checkAPI(x) {mir_sdr_ErrT e; if ((e = (x))) cout << #x << ": " << (int)e << endl;}
int
main(int argc, char *argv[])
{
  //Words wrds;
  //wrds.split("frequency 30.0,66 ");
  //for (auto w = wrds.begin(); w != wrds.end(); w++)
  //  cout << *w << endl;
  //return 0;
  WebSocketServer server("/Users/paul/Projects/webradio/html",8000);
  server.run();
  return 0;
}
