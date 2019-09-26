#pragma once
#include <libwebsockets.h>
#include "sdrplay.h"

// A RadioControl provides a ws protocol for configuring the radio
// tuner(s), tuner front end(s) starting and stopping the radio
// IQ data stream.
class RadioControl
{
  SDRPlay       mRadio;
  //Catalog       mCatalog;
  lws_protocols mProt;
public:
   RadioControl();
  ~RadioControl();
  // returns a string containing a JSON configuration
  string configuration();
  // Takes string commands and returns an ack
  string command(string cmd);
  // ws protocol structure
  lws_protocols protocol() { return mProt; }
};
