#pragma once
#include "spectrum.h"
#include <stdint.h>
#include <string>
#include <fftw3.h>
#include <json/json.h>

struct IQ
{
  short I;
  short Q;
};

struct IQData
{
  uint32_t  mSamples;
  uint64_t  mSystemTime;
  uint32_t  mFirstFrame;
  int       mGrChange;
  int       mRfChange;
  int       mFsChange;
  uint32_t  mReset;
  IQ       *mData;
   IQData();
  ~IQData();
  void allocate(unsigned int niq);
  void grabIQ(short *xi, short *xq, unsigned int niq);
  void barf(int fd);
  bool unbarf(int fd);
  int  fopen(std::string fname);
  int  fcreate(std::string fname);
  uint8_t *begin() { return (uint8_t*)mData; }
  size_t   size()  { return (size_t)sizeof(IQ)*mSamples; }
};

// Okay, refactor time. A Magic string or number is so late 70's. The file will
// contain a Json object as a null terminated string. This will be follwed by
// 0 or more IQData structs. Read until end of file.

// Opening opens the file filling in the header info and placing the file pointer
// at the start of the IQData. Creating writes a header to a new file placing the
// file pointer at the start of the IQData.
struct IQFile
{
  int          mFd;      // our usual file descriptor.
  Json::Value  mHeader;  // Json object
  std::string  mName;
  std::string  mError;

  int  open(std::string   fname);
  int  create(std::string fname, Json::Value &hdr);
  int  close();
  int  readData(IQData &data);
  int  writeData(IQData &data);
  int  readHeader();
  int  writeHeader();
  Json::Value &header() { return mHeader; }
};

struct IQStream : IQFile
{
  bool   mOpen;
  int    mCnt;
  int    mFrameSize;
  IQData mChunk;
   IQStream(std::string fname);
  ~IQStream();
  operator int();
  int frameSize() { return mFrameSize; }
  int frameSize(int fs) { return mFrameSize = fs; }
  int readSome(IQ *buffer, int nbuf);
  int readSome(fftw_complex *buffer, int nbuf);
};

IQStream &operator>>(IQStream &iq, Spectrum &sp);
IQStream &operator>>(IQStream &iq, FFT &fft);
