"""
    CW modem. Shifts center frequency to base band, filter a 500Hz
wide band, then shifts up by 650Hz.
"""
import numpy as np
from webradio.audio_modem import Modem
from webradio.tuner import FrequencyShift
from webradio.filters import IIRFilter, makeFilterChain


class CWModem(Modem):
    def __init__(self, radio):
        super().__init__()
        self.config.channels = 1
        self.config.bandwidth = 500
        self.config.modem_type = "CW"
        self.config.gain = 300
        self.config.out_sr, self.resampler = makeFilterChain(
            radio.sampleRate, radio.audio_sr
        )
        self.PCM = np.zeros(0, np.float32)
        self.tuner = None
        self.setup(radio)

    def setup(self, radio):
        self.updateTunning(radio)
        sr = self.config.out_sr
        bw = self.config.bandwidth
        fp = bw / sr
        fs = 2 * bw / sr
        self.lp_filter = IIRFilter(fp, fs, np.complex64)
        self.shift = FrequencyShift(650, sr, radio.iqdatalength)
        self.config.fstart = -bw / 2
        self.config.fend = bw / 2

    def updateConfig(self, change, radio):
        if change.radio.sampleRate or change.modem.bandwidth:
            self.config.out_sr, self.resampler = makeFilterChain(
                radio.sampleRate, radio.audio_sr
            )
        if change.modem.gain:
            self.config.gain = change.modem.gain
        self.setup(radio)

    def updateTunning(self, radio):
        df = radio.centerFreq - radio.tunerFreq
        self.tuner = FrequencyShift(df, radio.sampleRate, radio.iqdatalength)

    def __call__(self, iqdata):
        iq = self.shift(self.lp_filter(self.resampler(self.tuner(iqdata))))
        pcm = iq.real * self.config.gain
        self.PCM = np.concatenate((self.PCM, pcm))

    def getPCM(self):
        ret = np.float32(self.PCM).tobytes()
        self.PCM = np.zeros(0, np.float32)
        return ret
