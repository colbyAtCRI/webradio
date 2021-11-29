import numpy as np
from scipy.signal import lfilter

from webradio.audio_modem import Modem
from webradio.filters import IIRFilter, makeFilterChain
from webradio.tuner import FrequencyShift


class DCBlock:
    def __init__(self, f):
        w = f
        self.filter = ([1 - w / 2, -(1 - w / 2)], [1.0, -(1 - w)])
        self.state = [0]

    def __call__(self, data):
        output, self.state = lfilter(*self.filter, data, zi=self.state)
        return output


class AMModem(Modem):
    def __init__(self, radio):
        super().__init__()
        self.config.channels = 1
        self.config.bandwidth = 15000
        self.config.modem_type = "AM"
        self.config.gain = 100.0
        self.config.out_sr, self.resampler = makeFilterChain(
            radio.sampleRate, radio.audio_sr
        )
        self.setup(radio)

    def setup(self, radio):
        self.updateTunning(radio)
        sr = self.config.out_sr
        bw = self.config.bandwidth
        fp = bw / sr
        fs = (2 * bw + sr) / (3 * sr)
        print(f"AM fp: {fp} fs: {fs}")
        self.lp_filter = IIRFilter(fp, fs, np.complex64)
        self.dcblock = DCBlock(20 / sr)
        # fstart and fend are added to the tuner frequency
        # to get the beginning and end of the modem band.
        self.config.fstart = -bw / 2
        self.config.fend = bw / 2

    def updateConfig(self, change, radio):
        super().updateConfig(change, radio)
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
        iq = self.lp_filter(self.resampler(self.tuner(iqdata)))
        pcm = np.real(iq * iq.conj()) * self.config.gain
        self.PCM = np.concatenate((self.PCM, pcm))

    def getPCM(self):
        ret = np.float32(self.PCM).tobytes()
        self.PCM = np.zeros(0, np.float32)
        return ret
