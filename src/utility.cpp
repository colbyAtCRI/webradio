#include <unistd.h>
#include <sys/time.h>
#include <math.h>

long long systemTime()
{
   timeval now;
   gettimeofday(&now,NULL);
   return ((long long)now.tv_sec)*1000000 + now.tv_usec;
}
