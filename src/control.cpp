#include "control.h"
#include "webserver.h"
#include "sdrplay.h"

// helper class for IO buffers
class ControlBuffer
{
 size_t         mLen;
 unsigned char *mBuffer;
public:
 ControlBuffer(size_t len) {
   mBuffer = new unsigned char[LWS_PRE+len];
   mLen = len;
 }
 ControlBuffer(string str) {
   mBuffer = new unsigned char[LWS_PRE+str.size()];
   mLen = str.size();
   copy(str.begin(),str.end(),data());
 }
 ~ControlBuffer() {
   delete mBuffer;
 }
 unsigned char *data() {return mBuffer+LWS_PRE; }
 size_t length() { return mLen; }
};

// Protocol callback
int control_protocol_callback(lws *wsi,
                              lws_callback_reasons reason,
                              void *usr,
                              void *in,
                              size_t len)
{
  RadioControl *radio = (RadioControl*)lws_get_protocol(wsi)->user;
  switch (reason) {
    case LWS_CALLBACK_PROTOCOL_INIT:
      // No action required. We could allow one and only one
      // controlling client at this point.
      break;
    case LWS_CALLBACK_ESTABLISHED:
    {
      // Send the current radio information to the client
      ControlBuffer *buffer = new ControlBuffer(radio->configuration());
      lws_set_opaque_user_data(wsi,buffer);
      lws_callback_on_writable(wsi);
    }
      break;
    case LWS_CALLBACK_CLOSED:
    {
      // Cleanup any dangling buffers
      ControlBuffer *buffer = (ControlBuffer*)lws_get_opaque_user_data(wsi);
      if (buffer) {
        delete buffer;
        lws_set_opaque_user_data(wsi,NULL);
      }
    }
      break;
    case LWS_CALLBACK_SERVER_WRITEABLE:
    {
      // Send the string back to the client
      ControlBuffer *buffer = (ControlBuffer*)lws_get_opaque_user_data(wsi);
      if (buffer) {
        lws_write(wsi,buffer->data(),buffer->length(),LWS_WRITE_TEXT);
        delete buffer;
        lws_set_opaque_user_data(wsi,NULL);
      }
    }
      break;
    case LWS_CALLBACK_RECEIVE:
    {
      // process the client command.
      string reply;
      string cmd((char*)in,len);
      reply = radio->command(cmd);
      ControlBuffer *buffer = new ControlBuffer(reply);
      lws_set_opaque_user_data(wsi,(void*)buffer);
      lws_callback_on_writable(wsi);
    }
      break;
    default:
      break;
  }
  return 0;
}

RadioControl::RadioControl()
  : mRadio(),
    //mCatalog(),
    mProt({"control",&control_protocol_callback,0,0,0,(void*)this,0})
{
}

RadioControl::~RadioControl()
{

}

string RadioControl::command(string cmd)
{
  return cmd;
}

string RadioControl::configuration()
{
  return mRadio.config();
}
