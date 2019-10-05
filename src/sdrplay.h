#pragma once
#include <vector>
#include <string>
#include <mirsdrapi-rsp.h>
#include <json/json.h>

using namespace std;
using namespace Json;

struct Words : vector<string>
{
  Words() {

  }
  Words(string str) {
    split(str);
  }
  void split(string cmd);
};

class Catalog : public vector<mir_sdr_DeviceT>
{
public:
  Catalog();
 ~Catalog() {}
  mir_sdr_ErrT refresh();
  int firstAvailable();
  string catalog(); // json string value
private:
  uint32_t maxCount;
  void initDevT(mir_sdr_DeviceT *device);
  bool invalidDevT(mir_sdr_DeviceT *device, uint32_t found);
};

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
  int                      mBiasT;
  // Outputs
  int                      mGRdB;
  int                      mRdBSystem;
  int                      mSamplesPerPacket;
  Value                    tunerCfg();
  Value                    rfFrontEndCfg(string version);
  Value                    correctionCfg();
};

#define TAKEFIRST (-1)
class SDRPlay
{
  RadioParameters mPar;
  string mSerialNumber;
  int    mHwNumber; // 1 for RSP1A, 2 for RSPII, 3 for RSPduo
  int    mIdx;
  bool   mRunning;
public:
   SDRPlay(int idx=TAKEFIRST);
  ~SDRPlay() {
    if (mRunning)
      mir_sdr_StreamUninit();
    mir_sdr_ReleaseDeviceIdx();
  }
  string serialNumber() { return mSerialNumber; }
  string version() {
    switch (mHwNumber) {
      case 1:
        return "RSP1A";
      case 2:
        return "RSPII";
      case 3:
        return "RSPduo";
      default:
        return "unknown";
    }
  }
  string command(string cmd);
  string config();
  operator int() { return mIdx > -1; }
  void startStreamingThread();
};
