# WebRadio

This project fills a hole in my needs for a usable Software Defined Radio application.
Over the years it's been a struggle to find and maintain usable radio software on the
Mac and Linux. This void exists for several reasons. Chief amongst these is my loathing
for Windows which seems to host most radio software. This is especially true for SDRPlay
radios. SDRPlay offers SDRuno which is a truly fine option. Like their hardware, SDRuno
offers a rich array of features. Which brings me to my second problem, my radio is
upstairs while my preferred listening is downstairs.

I'd like, if I could, run my radios remotely. Now, there are again options. The ones I've
found all send the full IQ data stream over the local net to a program that runs on my
desktop. This puts the all the onus of demodulating, displaying and playing the
IQ data stream on the local machine. Gee, I hope this local program compiles. Well, on a
Mac, it usually doesn't at least without a fight. And, if it does, it likely won't for long.

Finally, sending raw IQ data is the worst possible approach IMO. IQ samples at 2MHz or more
is a lot of network bandwidth sucked up that's just not required for the job. All that is
require is 15-25 frames/sec of power spectrum and audio data. This is more than 10 time
fewer bytes per second on my network than one needs to send the IQ data directly.

WebRadio is solution to this problem. WebRadio is a python3 http/socket.io server that
serves power spectrum and audio data to be rendered in a browser window. All required HTTP
and JavaScript needed for rendering is supplied (served) by WebRadio. I've compiled and
run WebRadio on MacOs (Monterey) and Linux (Ubuntu and Ubuntu-Mate). I see no reason
WebRadio would not to work on Windows as well.

The main display is shown in Figure (1).

<p align="center">
  <image src="img/screenshot.png">
  <p align="center"><b>FIGURE 1 </b><em>Main Display</em></p>
</p>

# Installation

It is recommended to use a virtual or non-system python environment. My preference is
to use pyenv which hides the system pythons from inadvertent use. I've installed pyenv
and done the required .bashrc/.profile mods needed to make everything python transparent.

This server uses the following:

- Python 3
- [SDRPlay API](https://sdrplay.com) for the platform running WebRadio
- [SoapySDR](https://github.com/pothosware/SoapySDR)  python support
- [SoapySDRPlay3](https://github.com/pothosware/SoapySDRPlay3)
- [SoaptRLTSDR](https://github.com/pothosware/SoapyRTLSDR)
- requests (pip install requests)
- Flask (pip install flask)
- Flask-socketio (pip install flask-socketio)
- eventlet (pip install eventlet)
- numpy (pip install numpy)
- scipy (pip install scipy)

In addition one also needs the JavaScript libraries.

- socket.io.js
- jquery.js

For now these are in the git repository. Proper way to deal with this is to install npm
and associated machinery. However, to get Flask to serve these it was simplest to just
add them to the repository.

## Web Security

In a word, there currently is none. It could be added. I see the main use case of WebRadio
as operating behind a firewall on a local network so security seems not needed. I could be
wrong. In any case, I do not recommend letting WebRadio be on the Web at large.


## SoapySRD installation

The SoapySDR build insists on installing the python support to /usr/local which doesn't
help with a virtual environment at least on the way I have things configured. I've simply
moved `_SoapySDR.so` and `SoapySDR.py` to a directory, `site-packages/sopay_sdr`, in
my python search path. In any event, one must be able to `from soapy_sdr import SoapySDR`
from the python prompt.

# Running WebRadio

Once installed, run server.py from a command line. In a browser enter the address,

`<ip-address>:5000`

where `<ip-address>` is either `localhost` if you are on the server or, if you are on a
different machine than the server, the ip address of the server. A page listing the
available hardware currently plugged into the server that looks something like,

<p align="center">
  <image src="img/radios.png" border="1px solid black"></image>
  <p align="center"><b>FIGURE 2 </b><em>Radio Selection Menu</em></p>
</p>

This shows that there are two radios connected to the server. The first is a R820T style
rtl-sdr while the second is an SDRPlay RSPduo which shows up as 4 devices, one device
per operating mode.

To select and claim a device, highlight the device and press the open button. This will
load a the main WebRadio page for the selected device.

## Frequency Navigation

There are two user settable frequencies of interest, the radio center frequency and the
modem tuner frequency. The center frequency along with the radio sample rate determines the
band of RF spectrum displayed. The center frequency is at the center of the power spectrum
display. Which of these frequencies is being controlled is determined by the state of the
toggle button to the left of the 10-digit frequency control mid page below the power spectrum
display,

<p align="center">
  <image src="img/freqcontrol.png"></image>
  <p align="center"><b>FIGURE 3 </b><em>Frequency Control (Tuner selected)</em></p>
</p>

The second means of altering the is with the frequency control mid page right below the
power spectrum display. To the left of the 9 digit display is a toggle button which determines
which frequency is controlled and displayed. When a "T" is showing, the tuner frequency is
being controlled/displayed. Clicking the button will cause a "C" to be

Frequency navigation may also be done using the band select button boxes found to the right
of the Power and SMeter. The at present the first box contains 12 Ham Bands while the second
has 12 FM broadcast band stations. Currently these may be modified by editing `static/controls.js`. In the future these preset buttons will be programmable.

## Squelch Setting

Squelch is a feature needed for intermittent signals such as for Push-to-talk. This is
especially the case for narrow band FM as the noise may be quite loud when the signal
cuts out. On the top left above the main power spectrum display is the RF Power Meter
showing the peak RF level within the demodulation band (shown as the solid blue band).
The small circle on the RF power meter dial (See Figure 4) indicates the current squelch setting at its default value of -120 dBm.

<p align="center">
  <image src="img/powermeter1.png"></image>
  <p align="center"><b>FIGURE 4 </b><em>RF Power Meter</em></p>
</p>

To set or change the squelch level, one positions the mouse pointer over the meter dial. This brings up a green cursor which follows the mouse movement. To select a squelch level, position the cursor at the point desired. In Figure 5 we show a value of -70 dBm being selected.

<p align="center">
  <image src="img/powermeter2.png"></image>
  <p align="center"><b>FIGURE 5 </b><em>Squelch Selection Cursor</em></p>
</p>

The selection is finalized by clicking. The dial is then redraw as shown in Figure 6.

<p align="center">
  <image src="img/powermeter3.png"></image>
  <p align="center"><b>FIGURE 6 </b><em>After Selection</em></p>
</p>

When the RF power level drops below the squelch point, audio data stops being played. When the RF power level again exceeds the squelch setting, the audio resumes. 

## Current Limitations

- SoapySDR's gain abstraction is not well implemented in the current UI. From the start this
has been a learning exercise for Python, HTTP, CSS and JavaScript for me so nothing is
likely done well. On the upside, hacking the UI is just a matter of changing some HTTP and
JavaScript.

- An auto gain is needed for the AM, LSB, USB modems. At present the PCM audio data is simply
scaled by a constant. I'm thinking one should use the RF power level to set the PCM gain
scale factor. This is especially true for Airband push to talk where RF (and therefore the
PCM) level. Well, this needs work.

- Some kind of programmable preset switches.
