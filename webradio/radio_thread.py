from soapy_sdr import SoapySDR as sdr
import numpy as np
from threading import Thread, Event
import requests

from .fifo import Fifo
from .javadict import JavaDict
from .spectrum import PowerSpectrum
from .tuner import FrequencyShift
from .ammodem import AMModem
from .fmmodem import WBFMModem, NBFMModem, FMSModem
from .lsbmodem import LSBModem
from .usbmodem import USBModem
from .cwmodem import CWModem

modems = {
    "AM": AMModem,
    "NBFM": NBFMModem,
    "LSB": LSBModem,
    "USB": USBModem,
    "CW": CWModem,
    "WBFM": WBFMModem,
    "FMS": FMSModem,
}

RX = sdr.SOAPY_SDR_RX
CF32 = sdr.SOAPY_SDR_CF32


class ToneGenerator:
    def __init__(self, fo, radio):
        N = radio.iqdatalength
        S = radio.sampleRate
        self.ones = np.array([1.0e-3] * N, np.complex64)
        if isinstance(fo, list):
            self.tones = list(map(lambda f: FrequencyShift(f, S, N), fo))
        else:
            self.tones = [FrequencyShift(fo, S, N)]

    def __call__(self, iqdata):
        iq = iqdata
        for tone in self.tones:
            iq = iq + tone(self.ones[0:len(iq)])
        return iq


class Worker(Thread):
    def __init__(self, task):
        self.task = task
        super().__init__()

    def run(self):
        self.task.run()


def devs():
    return list(map(dict, sdr.Device_enumerate()))


class Radio:
    def __init__(self, dev, audio_sr):

        self.radio = sdr.Device(dev)
        if dev["driver"] == "sdrplay":
            self.radio.setSampleRate(RX, 0, 768000)
        else:
            self.radio.setSampleRate(RX, 0, 1536000)

        # fill out radio hardware info
        self.hardware = JavaDict()
        self.hardware.key = self.radio.getHardwareKey()
        self.hardware.info = dict(self.radio.getHardwareInfo())
        self.hardware.sampleRates = self.radio.listSampleRates(RX, 0)
        self.hardware.bandwidths = self.radio.listBandwidths(RX, 0)
        self.hardware.gains = self.radio.listGains(RX, 0)
        self.hardware.frequencies = self.radio.listFrequencies(RX, 0)
        self.hardware.antennas = self.radio.listAntennas(RX, 0)
        self.hardware.hasDCOffsetMode = self.radio.hasDCOffsetMode(RX, 0)
        self.hardware.hasFreqCorrection =\
            self.radio.hasFrequencyCorrection(RX, 0)

        # Transfer ArgsKeys to JavaDicts
        self.settings = []
        self.readSettingsDefaults()
        self.readSettings()
        self.config = JavaDict()
        self.config.audio_sr = audio_sr
        self.readConfig()
        self.config.frameRate = 60  # milliseconds
        self.config.iqdatalength = 4096
        self.config.offset = 0
        self.config.tunerFreq = self.config.centerFreq + self.config.offset
        self.running = Event()
        self.running.clear()
        self.collecting = Event()
        self.collecting.set()
        self.modem = AMModem(self.config)
        self.spectrum = PowerSpectrum(self.config)
        self.tones = ToneGenerator([], self.config)
        self.task = None
        self.dataQueue = Fifo(5)
        self.changeQueue = Fifo()
        self.ackQueue = Fifo()
        self.sid = None

    # Reads all settings and their default values.
    # Calling this sets up the settings structure
    # where the value field is initialized to the
    # default value. This is independent of what
    # the radio state is actually in.
    def readSettingsDefaults(self):
        settings = self.radio.getSettingInfo()
        for setting in settings:
            x = JavaDict()
            x.description = setting.description
            x.name = setting.name
            x.options = list(setting.options)
            x.type = setting.type
            x.value = setting.value
            x.key = setting.key
            x.optionNames = list(setting.optionNames)
            x.range = JavaDict()
            x.range.maximum = setting.range.maximum()
            x.range.step = setting.range.step()
            x.range.minimum = setting.range.minimum()
            self.settings.append(x)

    # Get the actual radio settings once the default
    # settings are supplied by readSettingsDefaults
    # called in the class constructor.
    def readSettings(self):
        for s in self.settings:
            s.value = self.radio.readSetting(s.key)

    # Set all settings based on what is in the value
    # field of self.settings.
    def writeSettings(self):
        for s in self.settings:
            self.radio.writeSetting(s.key, s.value)

    def updateSettings(self, change):
        n = 0
        for s in self.settings:
            if change.settings and change.settings.get(s.key):
                n = n + 1
                s.value = change.settings[s.key]
        if n > 0:
            self.writeSettings()

    def readConfig(self):
        self.readSettings()
        self.config.centerFreq = self.radio.getFrequency(RX, 0)
        self.config.bandwidth = self.radio.getBandwidth(RX, 0)
        self.config.sampleRate = self.radio.getSampleRate(RX, 0)
        self.config.gain = self.radio.getGain(RX, 0)
        self.config.gainMode = self.radio.getGainMode(RX, 0)
        self.config.antenna = self.radio.getAntenna(RX, 0)
        if self.hardware.hasFreqCorrection:
            self.config.freqCorrection =\
                self.radio.getFrequencyCorrection(RX, 0)
        if self.hardware.hasDCOffsetMode:
            self.config.dcOffsetMode = self.radio.getDCOffsetMode(RX, 0)
        self.config.settings = self.settings

    def updateConfig(self, change):
        if change.radio.not_empty():
            rc = change.radio
            if rc.sampleRate:
                print(f"changing sample rate to: {rc.sampleRate}")
                self.radio.deactivateStream(self.stream)
                self.radio.closeStream(self.stream)
                self.radio.setSampleRate(RX, 0, rc.sampleRate)
                self.stream = self.radio.setupStream(RX, CF32)
                self.radio.activateStream(self.stream)
            if rc.centerFreq:
                self.radio.setFrequency(RX, 0, rc.centerFreq)
                self.config.centerFreq = rc.centerFreq
            if rc.tunerFreq:
                self.setTunerFreq(rc.tunerFreq)
            if rc.bandwidth:
                self.radio.setBandwidth(RX, 0, rc.bandwidth)
            if rc.iqdatalength:
                self.config.iqdatalength = rc.iqdatalength
            if rc.gainMode is not None:
                self.radio.setGainMode(RX, 0, rc.gainMode)
            if rc.gain:
                self.radio.setGain(RX, 0, rc.gain)
            if rc.antenna:
                self.radio.setAntenna(RX, 0, rc.antenna)
            if self.hardware.hasDCOffsetMode and rc.dcOffsetMode is not None:
                self.radio.setDCOffsetMode(RX, 0, rc.dcOffsetMode)
            if self.hardware.hasFreqCorrection and rc.freqCorrection:
                self.radio.setFrequencyCorrection(
                    1, 0, float(rc.freqCorrection)
                )
            if rc.audio_sr:
                self.config.audio_sr = rc.audio_sr
                self.modem.setup(self.config)
            if rc.modem_type:
                modem = modems.get(rc.modem_type, AMModem)
                self.modem = modem(self.config)
            if rc.tones is not None:
                self.config.tones = rc.tones
                self.tones = ToneGenerator(rc.tones, self.config)
            self.updateSettings(rc)
            self.readConfig()

    def is_alive(self):
        return self.task and self.task.is_alive()

    def getData(self):
        return self.dataQueue.get()

    def radioStatus(self):
        data = JavaDict()
        data.radio = self.config
        data.spectrum = self.spectrum.config
        # data.tuner = self.tuner.config
        data.modem = self.modem.config
        return data

    def getStatus(self):
        return self.ackQueue.get()

    def spectrumData(self):
        return self.spectrum.getSpectrum()

    def audioData(self):
        return self.modem.getPCM()

    def apply(self, change_order):
        self.changeQueue.put(change_order)

    def run(self):
        elapsedTime = 0
        self.running.set()
        # Note that python numpy np.complex64 is
        # SoapySDR's CF32.
        iqdata = np.zeros(self.config.iqdatalength, np.complex64)
        self.stream = self.radio.setupStream(RX, CF32)
        self.radio.activateStream(self.stream)

        while self.running.is_set():

            change = self.changeQueue.get()
            if change:
                self.updateConfig(change)
                self.spectrum.updateConfig(change, self.config)
                self.modem.updateConfig(change, self.config)
                self.ackQueue.put(self.radioStatus())
                requests.get("http://localhost:5000/status/" + self.sid)

            iqdata = np.zeros(self.config.iqdatalength, np.complex64)

            ret = self.radio.readStream(self.stream, [iqdata], len(iqdata))

            # Okay, 3 out of 4 times 4046 IQs are returned, then 4092
            # many subtly bad things happen ignoring this.
            N = ret.ret
            iqdata = iqdata[0:N]

            iqdata = self.tones(iqdata)

            self.spectrum(iqdata)

            self.modem(iqdata)

            elapsedTime = elapsedTime + 1000 * (N / self.config.sampleRate)
            if elapsedTime > self.config.frameRate:
                self.dataQueue.put(
                    (self.radioStatus(), self.spectrumData(), self.audioData())
                )
                requests.get("http://localhost:5000/data-ready/" + self.sid)
                elapsedTime = 0

        self.radio.deactivateStream(self.stream)
        self.radio.closeStream(self.stream)

    # The concept is the user need only control/set the tunerFreq
    # and this logic sets the centerFreq of the radio sensibly.
    # The frequency offset parameter makes certain the tunerFreq
    # never lies on the 0 frequency of the spectrum. Most of the
    # time this isn't a problem. However, placing an AM modem on
    # the radio center frequency causes the carrier to be killed
    # off by the DC offset algorithm which is ugly and sounds noisy.
    #
    # Also, this places the frequency shifting on the modem code
    # where it belongs since modems may want to apply their own
    # offsets.
    #
    # Comment update: Given the trouble with SSB sounding gravlly
    # for tuning far from the radio center frequency, the feature
    # of adding an offset just adds confusion to the UI.
    def setTunerFreq(self, freq):
        self.config.tunerFreq = freq
        fl = self.config.centerFreq - self.config.sampleRate / 2
        fu = self.config.centerFreq + self.config.sampleRate / 2
        if np.abs(freq - self.config.centerFreq) < self.config.offset or not (
            freq < fu and freq > fl
        ):
            self.config.centerFreq = freq - self.config.offset
            self.radio.setFrequency(RX, 0, self.config.centerFreq)
        self.modem.updateTunning(self.config)

    def start(self):
        if not self.task:
            self.task = Worker(self)
            self.task.start()

    def stop(self):
        if self.task:
            self.running.clear()
            self.task.join()
            self.task = None

    def close(self):
        self.radio.close()
