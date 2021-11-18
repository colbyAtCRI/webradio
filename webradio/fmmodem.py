import numpy as np
from scipy.signal import lfilter
from .audio_modem import Modem
from .filters import Decimator, makeFilterChain
from .tuner import FrequencyShift


# from http://witestlab.poly.edu/~ffund/el9043/labs/lab1.html
class DeemphasisFilter:
    def __init__(self, sr):
        d = sr * 75e-6
        x = np.exp(-1 / d)
        self.b = [1 - x]
        self.a = [1, -x]
        self.state = [0]

    def __call__(self, data):
        output, self.state = lfilter(self.b, self.a, data, zi=self.state)
        return output


class NBFMModem(Modem):
    def __init__(self, radio):
        super().__init__()
        self.config.modem_type = "NBFM"
        self.config.channels = 1
        self.config.bandwidth = 8000
        self.config.gain = 1.0
        self.lastiq = 0
        self.PCM = []
        self.setup(radio)

    def setup(self, radio):
        self.updateTunning(radio)
        self.config.out_sr, self.resampler = makeFilterChain(
            radio.sampleRate, radio.audio_sr
        )
        self.deemphasis = DeemphasisFilter(self.config.out_sr)
        self.config.fstart = -self.config.bandwidth / 2
        self.config.fend = self.config.bandwidth / 2

    def updateConfig(self, change, radio):
        super().updateConfig(change, radio)
        self.setup(radio)

    def updateTunning(self, radio):
        df = radio.centerFreq - radio.tunerFreq
        self.tuner = FrequencyShift(df, radio.sampleRate, radio.iqdatalength)

    def __call__(self, iqdata):
        iq = self.resampler(self.tuner(iqdata))
        iq = np.concatenate(([self.lastiq], iq))
        pcm = np.angle(iq[:-1] * iq[1:].conj()) / (2 * np.pi)
        self.lastiq = iq[-1]
        pcm = self.deemphasis(pcm)
        self.PCM = np.concatenate((self.PCM, pcm))

    def getPCM(self):
        ret = np.float32(self.PCM).tobytes()
        self.PCM = np.zeros(0, np.float32)
        return ret


class WBFMModem(Modem):

    def __init__(self, radio):
        super().__init__()
        self.config.modem_type = "WBFM"
        self.config.channels = 1
        self.config.bandwidth = 15000
        self.config.gain = 1.0
        self.n_audio = 4
        self.lastiq = 0
        self.PCM = []
        self.setup(radio)

    def setup(self, radio):
        self.updateTunning(radio)
        self.config.in_sr, self.resampler = makeFilterChain(
            radio.sampleRate, self.n_audio*radio.audio_sr
        )
        self.deemphasis = DeemphasisFilter(self.config.in_sr)
        self.exit_decimation = Decimator(self.n_audio)
        self.config.out_sr = self.config.in_sr / self.n_audio
        self.config.fstart = -self.n_audio*radio.audio_sr / 2
        self.config.fend = self.n_audio*radio.audio_sr / 2

    def updateConfig(self, change, radio):
        super().updateConfig(change, radio)
        self.setup(radio)

    def updateTunning(self, radio):
        df = radio.centerFreq - radio.tunerFreq
        self.tuner = FrequencyShift(df, radio.sampleRate, radio.iqdatalength)

    def __call__(self, iqdata):
        iq = self.resampler(self.tuner(iqdata))
        iq = np.concatenate(([self.lastiq], iq))
        pcm = np.angle(iq[:-1] * iq[1:].conj()) / (2 * np.pi)
        self.lastiq = iq[-1]
        pcm = self.exit_decimation(self.deemphasis(pcm))
        self.PCM = np.concatenate((self.PCM, pcm))

    def getPCM(self):
        ret = np.float32(self.PCM).tobytes()
        self.PCM = np.zeros(0, np.float32)
        return ret


class FMSModem(Modem):

    def __init__(self, radio):
        super().__init__()
        self.config.modem_type = "FMS"
        self.config.channels = 2
        self.config.bandwidth = 15000
        self.config.gain = 1.0
        self.n_audio = 4
        self.lastiq = 0
        self.PCM = []
        self.setup(radio)

    def setup(self, radio):
        self.updateTunning(radio)
        self.config.in_sr, self.resampler = makeFilterChain(
            radio.sampleRate, self.n_audio*radio.audio_sr
        )
        tmp = FrequencyShift(
            19000,
            self.config.in_sr,
            radio.iqdatalength
        )
        self.kh19 = tmp.filter
        self.deemphasis_a = DeemphasisFilter(self.config.in_sr)
        self.deemphasis_b = DeemphasisFilter(self.config.in_sr)
        self.exit_decimation_a = Decimator(self.n_audio)
        self.exit_decimation_b = Decimator(self.n_audio)
        self.config.out_sr = self.config.in_sr / self.n_audio
        self.config.fstart = -self.n_audio*radio.audio_sr / 2
        self.config.fend = self.n_audio*radio.audio_sr / 2

    def updateConfig(self, change, radio):
        super().updateConfig(change, radio)
        self.setup(radio)

    def updateTunning(self, radio):
        df = radio.centerFreq - radio.tunerFreq
        self.tuner = FrequencyShift(df, radio.sampleRate, radio.iqdatalength)

    def __call__(self, iqdata):
        iq = self.resampler(self.tuner(iqdata))
        iq = np.concatenate(([self.lastiq], iq))
        sig = np.angle(iq[:-1] * iq[1:].conj()) / (2 * np.pi)
        self.lastiq = iq[-1]
        # sig contains the real modulation data
        #
        #   M(t) = (0.9*((A(t)+B(t))/2+(A(t)-B(t))*sin(2*wp*t)) + 0.1*sin(wp*t)) * 75kH
        #
        Ap = sum(sig * self.kh19[:len(sig)])/len(sig)
        Ap = Ap/np.abs(Ap)
        Bp = 2*((Ap*self.kh19[:len(sig)].conj())**2).imag
        sig_a = self.exit_decimation_a(self.deemphasis_a(sig))
        sig_b = self.exit_decimation_b(self.deemphasis_b(sig*Bp))
        pcm = np.zeros(2*len(sig_a))
        pcm[0::2] = sig_a + sig_b
        pcm[1::2] = sig_a - sig_b
        self.PCM = np.concatenate((self.PCM, pcm))

    def getPCM(self):
        ret = np.float32(self.PCM).tobytes()
        self.PCM = np.zeros(0, np.float32)
        return ret
