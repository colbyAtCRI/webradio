#include "rspduo.h"
#include "utility.h"
#include <sstream>
#include <iostream>
#include <json/json.h>

using namespace std;

class RSPduo;

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
  RSPduo *host = (RSPduo*)cbContext;
  // Grab the working buffer pointer. Once we get one we keep it till
  // we're done. Then we zero it to let the calling process know we
  // are done with it.
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
}

void gainCallback(unsigned int gRidx,
                  unsigned int gRdB,
                  void        *cbContext)
{
}

// Save some typing. All functions are called with (Value cmd)
#define check(x) {\
  mir_sdr_ErrT n; \
  if((n = x)) {\
    cerr << #x << ": " << errorStr(n) << endl;\
    errCount += 1;\
  } \
}

#define checkLog(x) {\
  mir_sdr_ErrT n;\
  if ((n = x)) {\
    log() << errorStr(n) << endl;\
  }\
}

BufferPipe::BufferPipe(WebSocketCustomer *customer, Action act)
  : Device(customer,act)
{
  if (pipe(mPipe))
    cerr << strerror(errno) << endl;
  mPollfd.fd     = mPipe[0];
  mPollfd.events = POLLIN;
}

BufferPipe::~BufferPipe()
{
  close(mPipe[0]);
  close(mPipe[1]);
}

// This is called by the WebSocketServer::run loop. It reads the
// solitary 'd' and then calls the WebSocketCustomer's member
// pointed to by mAction. What this action taken is is up to the
// whim of the coder. In our case it's onBufferComplete().

// This is called from the radio streaming callback. A single 'd' is
// sent to notify the WebSocketServer that a buffer has been added to
// the full buffer list and awaits processing and eventual freedom.
void BufferPipe::bufferComplete()
{
  char buffer('d');
  write(mPipe[1],&buffer,1);
}

string RSPduo::errorStr(mir_sdr_ErrT ner)
{
  static string msg[15] = {
    "Success",
    "Fail",
    "Invalid Parameter",
    "Out of range",
    "Gain update error",
    "RF update error",
    "FS update error",
    "Hardware error",
    "Aliasing error",
    "Already initialized",
    "Not initialized",
    "Not enabled",
    "Hardware version error",
    "Out of memory",
    "Hardware Removed"};
    return msg[ner];
}

const string RSPduo::mConfigChannel("config");
const string RSPduo::mIQDataChannel("iq-data");

RSPduo::RSPduo(WebSocketServer *srv) : WebSocketCustomer(srv)
{
  mJSON.settings_["commentStyle"] = "None";
  mJSON.settings_["indentation"] = "";
  // Leaving this out caused much confusion, radome errors, and strange hangs
  if (pthread_mutex_init(&mLock,NULL)) {
    server()->log(strerror(errno));
  }
  mBuffCount = 100;
  for (int n = 0; n < mBuffCount; n++)
    mFree.push(new IQData());
  mFrameCounter = 0;
  static lws_protocols prot[] = {
    {mConfigChannel.c_str(), webserver_callback,0,0,0,(void*)this,0},
    {mIQDataChannel.c_str(), webserver_callback,0,0,0,(void*)this,0},
  };
  mProtocols.push_back(prot[0]);
  mProtocols.push_back(prot[1]);
  mProtocols.push_back(prot[2]);

  mBufferPipe = new BufferPipe(this,(Action)&RSPduo::onBufferComplete);
  server()->add(mBufferPipe);
  server()->add(this);
}

RSPduo::~RSPduo()
{

}

void RSPduo::initDevT(mir_sdr_DeviceT *device, int &found, int maxCount)
{
  found = -1;
  for (int n = 0; n < maxCount; n++) {
    device[n].SerNo = NULL;
    device[n].DevNm = NULL;
    device[n].hwVer = 0xFF;
    device[n].devAvail = 0xFF;
  }
}

bool RSPduo::invaidDevT(mir_sdr_DeviceT *device, int found)
{
  for (int n = 0; n < found; n++) {
    if (device[n].SerNo == NULL ||
        device[n].DevNm == NULL ||
        device[n].devAvail == 0xFF)
        return true;
  }
  return found < 0;
}

Value RSPduo::getSDRplayDevices()
{
  Value           reply;
  mir_sdr_ErrT    ret;
  mir_sdr_DeviceT devices[5];
  int             found(-1);
  int             maxCount(5);

  //mir_sdr_DebugEnable(1);
  initDevT(devices,found,maxCount);
  while (invaidDevT(devices,found)) {
    ret = mir_sdr_GetDevices(devices,(uint32_t*)&found,(uint32_t)maxCount);
    if (ret) {
      reply["error"] = errorStr(ret);
      return reply;
    }
  }

  for (int n = 0; n < found; n++) {
    reply[n]["serial-number"] = devices[n].SerNo;
    reply[n]["device-number"] = devices[n].DevNm;
    reply[n]["availability"] = devices[n].devAvail;
    reply[n]["hardware-version"] = (int)devices[n].hwVer;
  }
  return reply;
}

void RSPduo::postConfig()
{
  server()->sendAllChannels(mConfigChannel,configAsString());
}

void RSPduo::openRadio(string sn, int hwVersion)
{
  Value radio;
  Value radios = getSDRplayDevices();
  mir_sdr_ErrT rval;
  int nd(0);
  radio["error-return"] = "radio not found";
  for (auto rad : radios) {
    if (rad["serial-number"].asString() == sn) {
      rval = mir_sdr_SetDeviceIdx(nd);
      radio = rad;
      radio["error"] = errorStr(rval);
      if (rval == mir_sdr_Success)
        mCfg["selected-radio"] = nd;
        mCfg["run-level"] = 1;
        initCfg(hwVersion);
        postConfig();
      break;
    }
    nd += 1;
  }
}

bool BufferPipe::readBufferDone()
{
  char buffer;
  return read(device(),&buffer,1) == 1 && buffer == 'd';
}

void RSPduo::onBufferComplete()
{
  // Drop the junk in the pipe. onBufferComplete should be called
  // while there are still 'd's stuck in the pipe. We may drop
  // IQ buffers here since getFullBuffer returns NULL is the buffer
  // is already been dropped previously.
  mBufferPipe->readBufferDone();
  IQData *buffer = getFullBuffer();
  if (buffer) {
    server()->sendAllChannels(mIQDataChannel,buffer->begin(),buffer->size());
    yieldFullBuffer(buffer);
  }
  while (buffer = getFullBuffer())
    yieldFullBuffer(buffer);
}

void RSPduo::processOutput(lws *wsi)
{
  WebSocketChannel *chn = server()->getChannel(wsi);
  chn->doWritable();
}

Value RSPduo::parse(const char *in, size_t len)
{
  Value root;
  mReader.parse(in,in+len,root,false);
  return root;
}

// Process all incomming protocols. Here we assume atomic
// revceives and that text buffers are not split.
void RSPduo::processInput(lws *wsi, void *in, size_t len)
{
  string protname = getProtocol(wsi);
  if (protname == mConfigChannel) {
    Value cfg = parse((const char*)in,len);
    if (mCfg.merge(cfg)) {
      doRadio();
      postConfig();
    }
  }
}

void RSPduo::doRadio()
{
  switch (mCfg["run-level"].asInt()) {
    // Startup, no radio selected. This is where and when the selection is
    // made if the user set selected-radio sensibly
    case 0: {
      int radio(mCfg["selected-radio"].asInt());
      Value radios(mCfg["radios"]);
      if (radio >= 0 && radio < radios.size()) {
        if (radios[radio]["availability"].asInt()) {
          openRadio(radios[radio]["serial-number"].asString(),radios[radio]["hardware-version"].asInt());
          if (mCfg["run-level"].asInt() == 1)
            startStreamingThread();
        }
      }
    }
      break;
    case 1:
      startStreamingThread();
      break;
    case 2:
      changeStreamingThread();
      break;
  }
}

// Called when changing radio settings. Like ports and filters
// and AGC and such.
int RSPduo::changeRadioSettings()
{
  int errCount(0);
  int nd(mCfg["selected-radio"].asInt());
  int hardware(mCfg["radios"][nd]["hardware-version"].asInt());
  check(mir_sdr_AgcControl(mir_sdr_AGC_DISABLE,0,0,0,0,0,mPar.mLNAstate));

  string ant(mCfg["antenna"].asString());
  if (ant == "A") {
    if (hardware == 3) {
       check(mir_sdr_rspDuo_TunerSel(mir_sdr_rspDuo_Tuner_1));
    }
    else if (hardware == 2) {
       check(mir_sdr_RSPII_AntennaControl(mir_sdr_RSPII_ANTENNA_A));
    }
    check(mir_sdr_AmPortSelect(0));
  }
  else if (ant == "B") {
    if (hardware == 3) {
       check(mir_sdr_rspDuo_TunerSel(mir_sdr_rspDuo_Tuner_2));
    }
    else if (hardware == 2) {
       check(mir_sdr_RSPII_AntennaControl(mir_sdr_RSPII_ANTENNA_B));
    }
    check(mir_sdr_AmPortSelect(0));
  }
  else if (ant == "High Z") {
    check(mir_sdr_AmPortSelect(1));
  }

  if (mCfg["sync-out"].asString() == "ON") {
    if (hardware == 3) {
       check(mir_sdr_rspDuo_ExtRef(1));
    }
    else if (hardware == 2) {
       check(mir_sdr_RSPII_ExternalReferenceControl(1));
    }
  }
  else {
    if (hardware == 3) {
       check(mir_sdr_rspDuo_ExtRef(0));
    }
    else if (hardware == 2) {
       check(mir_sdr_RSPII_ExternalReferenceControl(0));
    }
  }

  if (hardware == 2) {
     if (mCfg["notch-filter"].asString() == "ON") {
       check(mir_sdr_RSPII_RfNotchEnable(1));
     }
     else {
       check(mir_sdr_RSPII_RfNotchEnable(0));
     }
  }
  int dc = (mCfg["correction"]["DC"].asString()=="ON")?1:0;
  int iq = (mCfg["correction"]["IQ"].asString()=="ON")?1:0;
  check(mir_sdr_DCoffsetIQimbalanceControl(dc,iq));

  check(mir_sdr_SetPpm(mCfg["correction"]["PPM"].asDouble()));

  return errCount;
}

void RSPduo::RadioParameters::unpackParams(JConfig cfg)
{
    int fakeReason(0);

    mFsMHz = cfg["sample-rate-MHz"].asDouble();
    if (cfg.changes()["sample-rate-MHz"].asBool())
      fakeReason |= (int)mir_sdr_CHANGE_FS_FREQ;

    mFrMHz = cfg["center-frequency-MHz"].asDouble();
    if (cfg.changes()["center-frequency-MHz"].asBool())
      fakeReason |= (int)mir_sdr_CHANGE_RF_FREQ;

    mBwType = (mir_sdr_Bw_MHzT)cfg["bandwidth-kHz"].asInt();
    if (cfg.changes()["bandwidth-kHz"].asBool())
      fakeReason |= (int)mir_sdr_CHANGE_BW_TYPE;

    mIfType = (mir_sdr_If_kHzT)cfg["IF-kHz"].asInt();
    if (cfg.changes()["IF-kHz"].asBool())
      fakeReason |= (int)mir_sdr_CHANGE_IF_TYPE;

    mLoMode = (mir_sdr_LoModeT)cfg["lo-mode"].asInt();
    if (cfg.changes()["lo-mode"].asBool())
      fakeReason |= (int)mir_sdr_CHANGE_LO_MODE;

    mReasons = (mir_sdr_ReasonForReinitT) fakeReason;

    mGRdB     = cfg["gain-reduction"]["IF"].asInt();
    mLNAstate = cfg["gain-reduction"]["LNA"].asInt();
    mGrMode   = (mir_sdr_SetGrModeT)cfg["gain-set-mode"].asInt();
}

// Called when changing from run-level 1 -> 2.
void RSPduo::startStreamingThread()
{
  int errCount(0);

  mPar.unpackParams(mCfg);

  errCount = changeRadioSettings();

  check(mir_sdr_StreamInit(&mPar.mGRdB,
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
                           (void*)this));
}

void RSPduo::changeStreamingThread()
{
    int errCount(0);
    mPar.unpackParams(mCfg);
    errCount = changeRadioSettings();
    check(mir_sdr_Reinit(&mPar.mGRdB,
                          mPar.mFsMHz,
                          mPar.mFrMHz,
                          mPar.mBwType,
                          mPar.mIfType,
                          mPar.mLoMode,
                          mPar.mLNAstate,
                         &mPar.mRdBSystem,
                          mPar.mGrMode,
                         &mPar.mSamplesPerPacket,
                          mPar.mReasons));
}

void RSPduo::established(lws *wsi)
{
  if (getProtocol(wsi) == mConfigChannel) {
    WebSocketChannel *chn = makeChannel(wsi,LWS_WRITE_TEXT);
    chn->write(configAsString());
  }
  if (getProtocol(wsi) == mIQDataChannel) {
    WebSocketChannel *chn = makeChannel(wsi,LWS_WRITE_BINARY);
  }
}

void RSPduo::closeConnection(lws *wsi)
{
  // remove this channel
  server()->remove(wsi);
}

bool RSPduo::protocolInit(lws *wsi)
{
  // We come here once on server boot. We fill
  // an array with all the SDRplay devices found.
  // Since these can be hot-plugged it may need
  // periodic checking.
  if (getProtocol(wsi) == mConfigChannel) {
    mCfg["radios"] = getSDRplayDevices();
    // Set to an invalid index since only a change in value will
    // cause a radio to be selected. Changing it after the radio
    // is selected will deselect the radio freeing it for use
    // by others. If changed to a valid index, a new radio is
    // selected.
    mCfg["selected-radio"] = -1;
    mCfg["run-level"] = 0;
    // Prevent browser user from merging over these. Note that
    // this removes keys independent of where in the JSON they
    // appear. Since we're only using it for top level keys
    // that don't appear anywhere else it's fine.
    mCfg.protect("radios");
    mCfg.protect("run-level");
  }
}

string RSPduo::configAsString()
{
  return writeString(mJSON,mCfg);
}

void RSPduo::initCfg(int hw)
{
  mCfg["center-frequency-MHz"] = (double)5.0;
  mCfg["sample-rate-MHz"] = (double)2.048;
  mCfg["gain-reduction"]["IF"] = 20;
  mCfg["gain-reduction"]["LNA"] = 0;
  mCfg["correction"]["IQ"] = "ON";
  mCfg["correction"]["DC"] = "ON";
  mCfg["correction"]["PPM"] = 0.0;
  if (hw == 3) {
    mCfg["tuner-port"] = 1;
  }
  mCfg["antenna"] = "A";
  mCfg["sync-out"] = "OFF";
  mCfg["biasT"] = "OFF";
  mCfg["bandwidth-kHz"] = 1536;
  mCfg["IF-kHz"] = 0;
  mCfg["gain-set-mode"] = (int)mir_sdr_USE_RSP_SET_GR;
  mCfg["lo-mode"] = (int)mir_sdr_LO_Auto;
}

Value cfgSchema()
{
  Value cfg;
  ///static string states[] = {"UnAssigned","Opened","Running","Collecting"};
  Value states[] = {"Unassigned","Assigned","Running"};
  for (int n = 0; n < 3; n++)
    cfg["state"][n] = states[n];
  return cfg;
}

// Grab a free buffer from the free queue
IQData *RSPduo::getFreeBuffer()
{
  IQData *buffer;
  lock();
  if (mFree.empty() || mFrameCounter < 1)
    buffer = NULL;
  else {
    buffer = mFree.front();
    mFree.pop();
    mFrameCounter = mFrameCounter - 1;
  }
  unlock();
  return buffer;
}

// yield the now filled free buffer to the full queue
void RSPduo::yieldFreeBuffer(IQData *buffer)
{
  const char c('d');
  lock();
  mFull.push(buffer);
  // tell radio of the yielded buffer and there is a new
  // full buffer on the full list.
  mBufferPipe->bufferComplete();
  unlock();
}

// grab a full buffer from the full queue.
IQData *RSPduo::getFullBuffer()
{
  IQData *buffer;
  lock();
  if (mFull.empty())
    buffer = NULL;
  else {
    buffer = mFull.front();
    mFull.pop();
  }
  unlock();
  return buffer;
}

// yield a full buffer to the free que.
void RSPduo::yieldFullBuffer(IQData *buffer)
{
  lock();
  mFree.push(buffer);
  unlock();
}

void RSPduo::setFrameCounter(int nf)
{
  lock();
  mFrameCounter = nf;
  unlock();
}

int RSPduo::currentFrame()
{
  int fc;
  lock();
  fc = mFrameCounter;
  unlock();
  return fc;
}
