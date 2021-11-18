import numpy as np
from scipy.fft import fft, ifft


class Tuner:
    def __init__(self, cf, tf, sr, bl):
        # frequency step
        df = sr / bl
        # exact frequency shift
        sf = cf - tf
        # index shift
        self.nstep = round(sf / df)
        fineTune = sf - self.nstep * df
        self.fineTuner = FrequencyShift(fineTune, sr, bl)

    def __call__(self, iqdata):
        return self.fineTuner(ifft(np.roll(fft(iqdata), self.nstep)))


class FrequencyShift:
    def __init__(self, fs, sr, buflen):
        z = np.exp(2.0j * np.pi * fs / sr)
        self.filter = np.array(z ** range(buflen + 1), np.complex64)
        self.phase = np.complex64(1.0 + 0.0j)

    def __call__(self, iqdata):
        iq = self.phase * (iqdata * self.filter[: len(iqdata)])
        self.phase = self.phase * self.filter[len(iqdata)]
        self.phase = self.phase / np.abs(self.phase)
        return iq
