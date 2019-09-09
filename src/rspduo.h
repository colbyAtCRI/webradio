#pragma once
#include <json/json.h>
#include "webserver.h"
#include "iqdata.h"
#include "jconfig.h"
#include <queue>
#include <mirsdrapi-rsp.h>
#include <pthread.h>

using namespace Json;

class WebSocketCustomer;


// We have a BufferPipe which is used by the radio collection callback tell
// the WebSocketServer that a new full buffer need processing.
class BufferPipe : public Device
{
  int                mPipe[2];
  Action             mAction;
public:
   BufferPipe(WebSocketCustomer *customer,Action act);
  ~BufferPipe();
   bool readBufferDone();
  // Called in collection callback
  void bufferComplete();
};

// An interface definition for the websocket server. As much as possible
// we will use JSON for data passing. Binary data like IQ arrays is an
// exception
class RSPduo : public WebSocketCustomer
{
  JConfig             mCfg;
  StreamWriterBuilder mJSON;
  CharReaderBuilder   mReaderBuilder;
  static const string mConfigChannel;
  static const string mIQDataChannel;
  pthread_mutex_t     mLock; // every radio must have it's own mutex
  int                 mFrameCounter;
  int                 mBuffCount;

  // Data Buffer hell
  std::queue<IQData*> mFree;
  std::queue<IQData*> mFull;

  BufferPipe         *mBufferPipe;

  // Input and output params for mir_srd_StreamInit and mir_sdr_Reinit
  // function calls.
  struct RadioParameters
  {
    // Inputs. Anal retentive indentation induced by years of FORTRAN prog.
    double                   mFsMHz;
    double                   mFrMHz;
    mir_sdr_Bw_MHzT          mBwType;
    mir_sdr_If_kHzT          mIfType;
    mir_sdr_LoModeT          mLoMode;
    int                      mLNAstate;
    mir_sdr_SetGrModeT       mGrMode;
    mir_sdr_ReasonForReinitT mReasons;
    // Outputs
    int                      mGRdB;
    int                      mRdBSystem;
    int                      mSamplesPerPacket;
    void unpackParams(JConfig cfg);
  } mPar;

public:

  enum Radio_ErrorT {
    Success = 0,
    Warning,
    Fail
  };
   RSPduo(WebSocketServer *srv);
  ~RSPduo();
  bool    protocolInit(lws *wsi);
  void    established(lws *wsi);
  void    processOutput(lws *wsi);
  void    processInput(lws *wsi, void *in, size_t len);
  void    closeConnection(lws *wsi);

  string  errorStr(mir_sdr_ErrT err);

  IQData *getFreeBuffer();
  void    yieldFreeBuffer(IQData *buffer);
  IQData *getFullBuffer();
  void    yieldFullBuffer(IQData *buffer);
  void    setFrameCounter(int nf);
  int     currentFrame();

private:
  void    postConfig();
  void    onBufferComplete();
  Value   getSDRplayDevices();
  void    initDevT(mir_sdr_DeviceT *device, int &found, int maxCount);
  bool    invaidDevT(mir_sdr_DeviceT *device, int found);
  void    lock()   { pthread_mutex_lock(&mLock);}
  void    unlock() { pthread_mutex_unlock(&mLock);}
  void    doRadio();
  void    initCfg(int hw);
  Value   parse(const char *beg, size_t len);
  string  configAsString();
  void    openRadio(string sn,int hwVersion);
  void    startRadio();
  void    startStreamingThread();
  int     changeRadioSettings();
  void    changeStreamingThread();
};
