import numpy as np
from webradio.audio_modem import Modem
from webradio.tuner import FrequencyShift
from webradio.filters import IIRFilter, makeFilterChain


class LSBModem(Modem):
    def __init__(self, radio):
        super().__init__()
        self.config.channels = 1
        self.config.bandwidth = 3000
        self.config.modem_type = "LSB"
        self.config.gain = 300
        self.foff = 30
        self.config.out_sr, self.resampler = makeFilterChain(
            radio.sampleRate, radio.audio_sr
        )
        self.setup(radio)

    def setup(self, radio):
        self.updateTunning(radio)
        sr = self.config.out_sr
        bw = self.config.bandwidth
        fp = bw / sr
        fs = 2 * bw / sr
        self.lp_filter = IIRFilter(fp, fs, np.complex64)
        self.shift = FrequencyShift(
            -bw / 2 - self.foff,
            sr,
            radio.iqdatalength
        )
        self.config.fstart = -bw
        self.config.fend = 0

    def updateConfig(self, change, radio):
        if change.radio.sampleRate or change.modem.bandwidth:
            self.config.out_sr, self.resampler = makeFilterChain(
                radio.sampleRate, radio.audio_sr
            )
        if change.modem.gain:
            self.config.gain = change.modem.gain
        self.setup(radio)

    def updateTunning(self, radio):
        df = radio.centerFreq \
            - radio.tunerFreq \
            + self.config.bandwidth/2 \
            + self.foff
        self.tuner = FrequencyShift(df, radio.sampleRate, radio.iqdatalength)

    def __call__(self, iqdata):
        iq = self.shift(self.lp_filter(self.resampler(self.tuner(iqdata))))
        pcm = iq.real * self.config.gain
        self.PCM = np.concatenate((self.PCM, pcm))

    def getPCM(self):
        ret = np.float32(self.PCM).tobytes()
        self.PCM = np.zeros(0, np.float32)
        return ret
