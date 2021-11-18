import numpy as np
from .javadict import JavaDict


# Modem base class
class Modem:
    def __init__(self):
        self.config = JavaDict()
        self.config.modem_type = "Null"
        self.cursorFreq = 0
        self.config.bandwidth = 0
        self.config.audio_sr = 48000
        self.PCM = np.zeros(0, np.float32)

    # These are common to all modems so this
    # should be called prior to the overloaded
    # function specific to modem type
    def updateConfig(self, change, srate):
        if change.modem.bandwidth:
            self.config.bandwidth = change.modem.bandwidth
        if change.modem.cursorFreq:
            self.config.cursorFreq = change.modem.cursorFreq

    # Given the user placed cursor, return the actual tuner
    # frequency. For an AM or FM modem this is the correct
    # choice. For CW or SSB, a fixed offset from the displayed
    # cursorFreq is returned.
    def tunerFreq(self):
        return self.config.cursorFreq

    def __call__(self, iqdata):
        pass

    def getPCM(self):
        return b""
