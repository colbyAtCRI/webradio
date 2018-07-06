#include "rspduo.h"

int
main(int argc, char *argv[])
{
  if (fork() == 0) {
    fclose(stdin);
    freopen("server.log","a+",stdout);
    freopen("error.log","a+",stderr);
    WebSocketServer server("../html/",1535);
    RSPduo radio(&server);
    server.run();
  }
  return 0;
}
