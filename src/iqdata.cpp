#include "iqdata.h"
#include <iostream>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <errno.h>

using namespace Json;
using namespace std;

int IQFile::writeHeader()
{
  int nb;
  stringstream ss;
  ss << mHeader;
  string str = ss.str();
  // include the null termination, size(str)+1
  nb = ::write(mFd,str.c_str(),str.size()+1);
  if (nb < 0) {
    mError = strerror(errno);
    return nb;
  }
  if (nb != str.size()+1) {
    mError = "write of Json failed";
    return -1;
  }
  return 0;
}

int IQFile::readHeader()
{
  int    nb;
  string jstr;
  char   buffer[1];
  while ((nb = ::read(mFd,buffer,1)) == 1) {
    if (buffer[0] == 0x00)
      break;
    jstr.push_back(buffer[0]);
  }
  if ( nb < 1 ) {
    mError = strerror(errno);
    return nb;
  }
  stringstream js(jstr);
  try {
    js >> mHeader;
  }
  catch (exception &e) {
    mError = e.what();
    return -1;
  }
  return 0;
}

int IQFile::open(string name)
{
  mName = name;
  mFd = ::open(mName.c_str(),O_RDONLY);
  if (mFd < 0)
    mError = strerror(errno);
  return readHeader();
}

int IQFile::create(string name, Value &hdr)
{
  mName = name;
  mHeader = hdr;
  mFd = ::open(mName.c_str(),O_CREAT|O_TRUNC|O_WRONLY,S_IWUSR|S_IRUSR|S_IRGRP);
  if (mFd < 0)
    mError = strerror(errno);
  return writeHeader();
}

int IQFile::close()
{
  return ::close(mFd);
}

int IQFile::readData(IQData &data)
{
  if (!data.unbarf(mFd))
    return -1;
  return 0;
}

int IQFile::writeData(IQData &data)
{
  data.barf(mFd);
  return 0;
}

IQData::IQData()
{
  mSamples = 0;
  mData = NULL;
}

IQData::~IQData()
{
  if (mData)
    delete mData;
}

int IQData::fopen(string fname)
{
  return open(fname.c_str(),O_RDONLY);
}

int IQData::fcreate(string fname)
{
  return open(fname.c_str(),O_CREAT|O_TRUNC|O_WRONLY,S_IWUSR|S_IRUSR|S_IRGRP);
}

bool IQData::unbarf(int fd)
{
  int hsize = sizeof(IQData) - sizeof(mData);
  if (read(fd,(char*)this,hsize) != hsize)
    return false;
  if (mData == NULL)
    allocate(mSamples);
  hsize = mSamples * sizeof(IQ);
  if (read(fd,(char*)mData,hsize) != hsize)
    return false;
  return true;
}

void IQData::allocate(unsigned int ns)
{
  if (mData != NULL && mSamples == ns)
    return;
  if (mData)
    delete mData;
  mSamples = ns;
  mData = new IQ[ns];
}

void IQData::grabIQ(short *xi, short *xq, unsigned int ns)
{
  allocate(ns);
  for (int n = 0; n < ns; n++) {
    mData[n].I = xi[n];
    mData[n].Q = xq[n];
  }
}

void IQData::barf(int fd)
{
  int nb;
  int hsize = sizeof(IQData) - sizeof(IQ*);
  if ((nb = write(fd,(char*)this,hsize)) != hsize) {
    if (nb < 0)
      cout << "write fail: " << strerror(errno) << endl;
    else
      cout << "write fail " << nb << "  " << hsize << endl;
  }
  hsize = mSamples * sizeof(IQ);
  if ((nb = write(fd,(char*)mData,hsize)) != hsize) {
    if (nb < 0)
      cout << "write fail: " << strerror(errno) << endl;
    else
      cout << "write fail " << nb << "  " << hsize << endl;
  }
}

IQStream::IQStream(string fname)
{
  mOpen = false;
  if (open(fname)==0) {
    mOpen = true;
    readData(mChunk);
    mCnt  = mChunk.mSamples;
    mFrameSize = mChunk.mSamples;
  }
}

IQStream::~IQStream()
{
  close();
}

int IQStream::readSome(IQ *data, int nd)
{
  int nt(0);
  int pt;
  while (nt < nd) {
    if (mCnt < 1) {
      if (!mChunk.unbarf(mFd)) {
        mOpen = false;
        return nt;
      }
      mCnt = mChunk.mSamples;
    }
    pt = mChunk.mSamples - mCnt;
    data[nt] = mChunk.mData[pt];
    nt = nt + 1;
    mCnt = mCnt - 1;
  }
  return nt;
}

int IQStream::readSome(fftw_complex *data, int nd)
{
  int nt(0);
  int pt;
  while (nt < nd) {
    if (mCnt < 1) {
      if (!mChunk.unbarf(mFd)) {
        mOpen = false;
        return nt;
      }
      mCnt = mChunk.mSamples;
    }
    pt = mChunk.mSamples - mCnt;
    data[nt][0] = mChunk.mData[pt].I;
    data[nt][1] = mChunk.mData[pt].Q;
    nt = nt + 1;
    mCnt = mCnt - 1;
  }
  return nt;
}

IQStream::operator int()
{
  if (mOpen &&  mCnt < 1) {
    mOpen = mChunk.unbarf(mFd);
    if (mOpen)
      mCnt = mChunk.mSamples;
  }
  return mOpen && mCnt > 0;
}

IQStream &operator>>(IQStream &iq, FFT &fft)
{
  iq.readSome(fft.in,iq.frameSize());
  return iq;
}

IQStream &operator>>(IQStream &iq, Spectrum &sp)
{
  if (sp.size()==0) {
    sp.resize(iq.frameSize());
  }
  iq.readSome((fftw_complex*)&sp[0],(int)sp.size());
  return iq;
}
