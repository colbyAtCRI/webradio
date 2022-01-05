import numpy as np
import socketio
from struct import unpack
from javadict import ChangeOrder, toCO

# from matplotlib import pyplot as plt


def num(byteArray, n):
    return unpack("f", byteArray[4 * n : 4 * n + 4])[0]


def frombytes(byteArray):
    return [num(byteArray, n) for n in range(int(len(byteArray) / 4))]


def apply(co):
    sio.emit("apply", co)


def strobe():
    sio.emit("strobe")


def claim_callback(hw):
    global hardware
    hardware = hw


def claim(n):
    sio.emit("claim", (n, 48000), callback=claim_callback)


def kgo():
    co = ChangeOrder()
    co.radio.bandwidth = 1536000
    co.radio.centerFreq = 1300000
    co.tuner.freq = 810000
    apply(co)


def fm1049():
    co = ChangeOrder()
    co.radio.centerFreq = 104900000
    co.tuner.freq = co.radio.centerFreq
    co.radio.modem_type = "FM"
    co.modem.bandwidth = 150000
    apply(co)


def bye():
    sio.disconnect()

def plot():
    fstart = data.spectrum.fstart
    fend = data.spectrum.fend
    fstep = data.spectrum.fstep
    fl = data.radio.centerFreq - data.radio.bandwidth / 2
    fu = data.radio.centerFreq + data.radio.bandwidth / 2
    freq = np.arange(fstart, fend, fstep)
    spec = data.spectrum.data
    y = [p for (f, p) in zip(freq, spec) if f >= fl and f <= fu]
    x = [f for (f, p) in zip(freq, spec) if f >= fl and f <= fu]
    plt.plot(x, y)
    plt.show()


sio = socketio.Client()

last = None
data = None


@sio.on("connect")
def connect_handler():
    print("connected")


@sio.on("disconnect")
def disconnect_handler():
    print("disconnect")


@sio.on("status")
def on_ack(state):
    global status
    status = toCO(state)
    print(f"{state}")


@sio.on("data")
def on_data(q1, q2, q3):
    global data
    q1 = toCO(q1)
    q1.spectrum.data = frombytes(q2)
    q1.modem.pcm = frombytes(q3)
    data = q1


def connect():
    sio.connect("http://localhost:5000")
