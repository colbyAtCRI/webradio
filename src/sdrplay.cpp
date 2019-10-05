#include "sdrplay.h"
#include <iostream>
#include <sstream>

void streamCallback(short   *xi,
                    short   *xq,
                    uint32_t firstSampleNum,
                    int      grChange,
                    int      rfChange,
                    int      fsChange,
                    uint32_t numSamples,
                    uint32_t reset,
                    uint32_t hwChange,
                    void    *cbContext)
{
  SDRPlay *host = (SDRPlay*)cbContext;
  // Grab the working buffer pointer. Once we get one we keep it till
  // we're done. Then we zero it to let the calling process know we
  // are done with it.
  /*
  IQData *buffer = host->getFreeBuffer();
  if (buffer) {
    buffer->mSystemTime = systemTime();
    buffer->mFirstFrame = firstSampleNum;
    buffer->mGrChange   = grChange;
    buffer->mRfChange   = rfChange;
    buffer->mFsChange   = fsChange;
    buffer->mReset      = reset;
    buffer->grabIQ(xi,xq,numSamples);
    host->yieldFreeBuffer(buffer);
  }
  */
}

void gainCallback(unsigned int gRidx,
                  unsigned int gRdB,
                  void        *cbContext)
{
}

RadioParameters defPar = {
  10.0,
  2.0,
  mir_sdr_BW_1_536,
  mir_sdr_IF_Zero,
  mir_sdr_LO_Auto,
  0,
  mir_sdr_USE_SET_GR,
  mir_sdr_CHANGE_NONE,
  0,
  0,
  0
};

Value RadioParameters::tunerCfg()
{
  Value tuner;
  tuner["frequency"]  = mFrMHz;
  tuner["sampleRate"] = mFsMHz;
  tuner["bandwidth"]  = mBwType;
  tuner["IFmode"]     = mIfType;
  tuner["LOmode"]     = mLoMode;
  tuner["LNAstate"]   = mLNAstate;
  tuner["GainMode"]   = mGrMode;
  tuner["Gain"]       = mGRdB;
  tuner["GainSystem"] = mRdBSystem;
  tuner["SampleSize"] = mSamplesPerPacket;
  return tuner;
}

Value RadioParameters::rfFrontEndCfg(string version)
{
  Value frontEnd;
  if ("RSP1A" == version) {
    frontEnd["biasT"] = mBiasT;
    frontEnd["DABnotch"] = 0;
    frontEnd["broadcastNotch"] = 0;
  }
  else if ("RSPII" == version) {
    frontEnd["antenna"] = mir_sdr_RSPII_ANTENNA_A;
    frontEnd["biasT"] = mBiasT;
    frontEnd["RFnotch"] = 0;
  }
  else if ("RSPduo" == version) {
    frontEnd["tuner"] = mir_sdr_rspDuo_Tuner_1;
    frontEnd["biasT"] = mBiasT;
    frontEnd["tuner1-AMnotch"] = 0;
    frontEnd["broadcastNotch"] = 0;
    frontEnd["DABnotch"] = 0;
  }
  return frontEnd;
}

SDRPlay::SDRPlay(int idx) : mPar(defPar)
{
  Catalog radios;
  if (TAKEFIRST == idx)
    mIdx = radios.firstAvailable();
  else
    mIdx = idx;
  if (mIdx > TAKEFIRST) {
    if (mir_sdr_SetDeviceIdx(mIdx)) {
      mIdx = TAKEFIRST;
    }
    else {
      mSerialNumber = radios[mIdx].SerNo;
      mHwNumber = (int)radios[mIdx].hwVer;
    }
  }
}

string SDRPlay::config()
{
  Value        cfg;
  stringstream ss;
  cfg["serialNumber"] = mSerialNumber;
  cfg["version"]      = version();
  cfg["tuner"]        = mPar.tunerCfg();
  cfg["frontEnd"]     = mPar.rfFrontEndCfg(version());
  ss << cfg;
  return ss.str();
}

// Called when changing from run-level 1 -> 2.
void SDRPlay::startStreamingThread()
{
  mir_sdr_ErrT ret;
  ret = mir_sdr_StreamInit(&mPar.mGRdB,
                            mPar.mFsMHz,
                            mPar.mFrMHz,
                            mPar.mBwType,
                            mPar.mIfType,
                            mPar.mLNAstate,
                           &mPar.mRdBSystem,
                            mPar.mGrMode,
                           &mPar.mSamplesPerPacket,
                           &streamCallback,
                           &gainCallback,
                           (void*)this);
  mRunning = (ret == mir_sdr_Success);
}

void Words::split(string cmd) {
  static string delim(" ,");
  bool inword(false);
  string word;
  clear();
  for (auto c = cmd.begin(); c != cmd.end(); c++) {
    if (delim.find(*c) == string::npos) {
      word += *c;
      inword = true;
    }
    else {
      if (inword) {
        push_back(word);
        word.clear();
        inword = false;
      }
    }
  }
  if (!word.empty())
    push_back(word);
}

string SDRPlay::command(string cmd)
{
  Words wrds(cmd);
  if (wrds.empty())
    return "";
  if (wrds[0] == "frequency") {
  }
  return wrds[0];
}

Catalog::Catalog() : maxCount(4)
{
  refresh();
}

int Catalog::firstAvailable()
{
  int idx(-1);
  for (auto r = begin(); r != end(); r++) {
    idx += 1;
    if (r->devAvail) {
      return idx;
    }
  }
  return -1;
}

mir_sdr_ErrT Catalog::refresh()
{
  mir_sdr_ErrT err(mir_sdr_Success);
  uint32_t found(maxCount+1);
  mir_sdr_DeviceT devs[maxCount];
  initDevT(devs);
  while (invalidDevT(devs,found)) {
      if ((err = mir_sdr_GetDevices(devs,&found,maxCount))) {
        return err;
      }
  }
  clear();
  for (auto n = 0; n < found; n++)
    push_back(devs[n]);
  return mir_sdr_Success;
}

string Catalog::catalog()
{
  stringstream ss;
  Value radios(arrayValue);
  for (auto r = begin(); r != end(); r++) {
    Value radio;
    radio["serialNumber"] = r->SerNo;
    radio["device"] = r->DevNm;
    radio["available"] = r->devAvail;
    radio["hardware"] = r->hwVer;
    radios.append(radio);
  }
  ss << radios;
  return ss.str();
}

void Catalog::initDevT(mir_sdr_DeviceT *device)
{
  for (auto n = 0; n < maxCount; n++) {
    device[n].SerNo = NULL;
    device[n].DevNm = NULL;
    device[n].hwVer = 0xFF;
    device[n].devAvail = 0xFF;
  }
}

bool Catalog::invalidDevT(mir_sdr_DeviceT *device, uint32_t found)
{
  if (found > maxCount)
    return true;
  for (int n = 0; n < found; n++) {
    if (device[n].SerNo == NULL ||
        device[n].DevNm == NULL ||
        device[n].devAvail == 0xFF)
        return true;
  }
  return false;
}
