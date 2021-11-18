import numpy as np
from numpy.fft import fft, fftshift
from .javadict import JavaDict
from .filters import DecimationFilter

# from modem import LowPassFilter

# Maintain a power spectrum given arbitrary time domain IQ buffers.
# Removes dependence of the power spectrum on the radio IQ buffer size.


class PowerSpectrum:
    def __init__(self, radio, length=2048):
        self.config = JavaDict()
        self.config.length = length
        self.power = np.zeros(length, np.float32)
        self.iqbuffer = np.zeros(0, np.float32)
        self.config.decimation = 1
        self.count = 0
        self.config.crop = True
        self.init(radio)

    def init(self, radio):
        dec = self.config.decimation
        self.config.fstep = radio.sampleRate / self.config.length / dec
        self.config.fstart = radio.centerFreq - radio.sampleRate / 2.0 / dec
        self.config.fend = radio.centerFreq + radio.sampleRate / 2.0 / dec
        # set the displayed bandwidth sensibly
        if dec > 1:
            self.config.bstart =\
                radio.centerFreq - 0.9 * radio.sampleRate / 2.0 / dec
            self.config.bend =\
                radio.centerFreq + 0.9 * radio.sampleRate / 2.0 / dec
        elif self.config.crop:
            self.config.bstart = radio.centerFreq - radio.bandwidth / 2
            self.config.bend = radio.centerFreq + radio.bandwidth / 2
        else:
            self.config.bstart = self.config.fstart
            self.config.bend = self.config.fend

    def updateConfig(self, change, radio):
        if change.spectrum.length:
            self.config.length = change.spectrum.length
            self.power = np.zeros(self.config.length, np.float32)
            self.iqbuffer = np.zeros(0, np.complex64)
            self.count = 0
        if change.spectrum.decimation:
            self.config.decimation = change.spectrum.decimation
            self.decimationFilter = DecimationFilter(self.config.decimation)
        if change.spectrum.crop is not None:
            self.config.crop = change.spectrum.crop
        self.init(radio)

    def __call__(self, iq_buffer):
        dec = int(self.config.decimation)
        if dec > 1:
            iqs = self.decimationFilter(iq_buffer)
        else:
            iqs = iq_buffer
        self.iqbuffer = np.concatenate((self.iqbuffer, iqs))
        while len(self.iqbuffer) >= self.config.length:
            iqs = fft(self.iqbuffer[0:self.config.length]) / self.config.length
            self.iqbuffer = self.iqbuffer[self.config.length:]
            self.power = self.power + np.real(iqs * iqs.conj())
            self.count = self.count + 1

    def getSpectrum(self):
        if self.count <= 0:
            return
        ret = fftshift(self.power / self.count)
        self.count = 0
        self.power.fill(0.0)
        return np.float32(10.0 * np.log10(ret)).tobytes()
