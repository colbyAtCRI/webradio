import numpy as np
from numpy.fft import fft, fftshift
from webradio.javadict import JavaDict
from webradio.filters import DecimationFilter
from webradio.tuner import FrequencyShift

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
        self.init(radio)

    def init(self, radio):
        dec = self.config.decimation
        if dec == 1:
            self.config.displayCenter = radio.centerFreq
        self.config.fstep = radio.sampleRate / self.config.length / dec
        self.config.fstart = self.config.displayCenter - radio.sampleRate / 2.0 / dec
        self.config.fend = self.config.displayCenter + radio.sampleRate / 2.0 / dec

    def updateConfig(self, change, radio):
        if change.spectrum.length:
            self.config.length = change.spectrum.length
            self.power = np.zeros(self.config.length, np.float32)
            self.iqbuffer = np.zeros(0, np.complex64)
            self.count = 0
        if change.spectrum.decimation:
            self.config.decimation = change.spectrum.decimation
            self.decimationFilter = DecimationFilter(self.config.decimation)
            self.config.displayCenter = radio.tunerFreq
            self.freqShift = FrequencyShift(
                radio.centerFreq - radio.tunerFreq, 
                radio.sampleRate, 
                radio.iqdatalength
            )
        self.init(radio)

    def __call__(self, iq_buffer):
        dec = int(self.config.decimation)
        if dec > 1:
            iqs = self.decimationFilter(self.freqShift(iq_buffer))
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
