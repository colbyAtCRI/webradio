"""
    File contains some filter classes which wrap scipy.signal
filters so that they preserve state between successive calls.
"""
import numpy as np
from scipy.signal import iirdesign, lfilter, butter


class IIRFilter:
    """
        IIR filter wrapper. Designs an elliptic filter with
    0.5 dB in the passband and 40 dB in the stop band. The
    goal is not to be too stingy ending up with an unstable
    filter design. Basically, I don't really know what is best
    here.
    """

    def __init__(self, wp, ws, data_type=np.complex64):
        self.b, self.a = iirdesign(wp, ws, 0.5, 40)
        ns = np.max([len(self.a), len(self.b)]) - 1
        self.state = np.zeros(ns, data_type)
        # print(f'Filter length Bs: {len(self.b)} As: {len(self.a)}')

    def __call__(self, iqdata):
        output, self.state = lfilter(self.b, self.a, iqdata, zi=self.state)
        return output


class Butterworth:
    """
        Vanilla Butterworth filter. These are mostly employed
    prior to decimation to audio sampling rates. The current
    default of 7 for the filter order is somewhat arbitrary.
    """

    def __init__(self, fp, order=7, dtype=np.complex64):
        self.fp = fp
        self.flt = butter(order, fp)
        ns = np.max((len(self.flt[0]), len(self.flt[1]))) - 1
        self.state = np.zeros(ns, dtype)

    def __call__(self, iqdata):
        output, self.state = lfilter(*self.flt, iqdata, zi=self.state)
        return output


class Decimator:
    """
        Simple integer value rate decimator. Much of the issues
    surrounding decimation are driven by the native sample rate
    of the browser audio API. Two values are common, 48000 and
    44100. Giving the brouser data at a rate that differs from
    it's native rate will work, but buffering delays build up
    causing the spectrum display to be out of sync.
    """

    def __init__(self, dec, data_type=np.complex64):
        self.dec = int(dec)
        self.dty = data_type
        self.beg = 0

    def __call__(self, iqdata):
        output = iqdata[self.beg::self.dec]
        self.beg = (self.beg + len(iqdata)) % self.dec
        return output


class DecimationFilter:
    """
        Decimation Filter is a lowpass filter followed by
    data decimation. Here a wp = 1/dec pass band is paired
    with a decimation by dec where dec is any integer > 2.
    """

    def __init__(self, dec):
        self.dec = int(dec)
        if self.dec > 1:
            self.filter = Butterworth(1 / dec)
            self.decimator = Decimator(self.dec)

    def __call__(self, iqdata):
        if self.dec > 1:
            return self.decimator(self.filter(iqdata))
        else:
            return iqdata


class FilterChain:
    """
        A filter chain is a list of DecimationFilters that
    are applied in order.
    """

    def __init__(self, declst):
        self.chain = list(map(DecimationFilter, declst))

    def __call__(self, iqdata):
        output = iqdata
        for flt in self.chain:
            output = flt(output)
        return output


# The primary assumption made here is that a radio sampling rate
# is an integer containing at most prime factors, 2, 3, 5, 7. This
# is the case for the three style radios I own. divisors returns
# a list of all divisors of N in ascending order starting with 1
# and ending with N.
def divisors(N):
    primes = [2, 3, 5, 7]
    powers = []
    for p in primes:
        m = 1
        while np.gcd(N, p) == p:
            N = int(N / p)
            m = m + 1
        powers.append(m)
    ret = [
        2 ** i * 3 ** j * 5 ** k * 7 ** Z
        for i in range(powers[0])
        for j in range(powers[1])
        for k in range(powers[2])
        for Z in range(powers[3])
    ]
    if N > 1:
        ret.append(N)
    ret.sort()
    return ret


# Again assuming only 2,3,5,7 prime factors returns a sorted list of
# prime factors. Thus, factors(16) -> [2 2 2 2] and factors(10) -> [2 5]
def factors(N):
    N = int(N)
    primes = [2, 3, 5, 7]
    facts = []
    for p in primes:
        while np.gcd(N, p) == p:
            facts.append(p)
            N = int(N / p)
    return facts


# Decimating the radio sample rate to audio sampling rates often requires
# fairly large decimation factors. A Filter Chain breaks this rate reduction
# into the prime factors making up the whole dec. Thus a decimation by ten
# would occure in two steps, decimation by p=2 followed by decimation by p=5.
# Each decimation step is preceeded by a Butterworth IIR filter with a bandstop
# frequency of 1/p where p is the following decimation factor.
#
# Returns (actual_sr, filterChain)

def makeFilterChain(RR, AR):
    if round(RR/AR) < 10:
        dec = round(RR/AR)
        return RR / dec, FilterChain([dec])
    else:
        rR = round(RR)
        aR = round(AR)
        fac = divisors(rR)
        ll = list(filter(lambda n: n < aR, fac))
        lu = list(filter(lambda n: n >= aR, fac))
        A = ll[-1]
        B = lu[0]
        if abs(A - aR) < abs(B - aR):
            dec = round(RR / A)
        else:
            dec = round(RR / B)
        return RR / dec, FilterChain(factors(dec))
