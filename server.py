#!/usr/bin/env python
from os import getpid
from flask import Flask, render_template, request
from webradio.radio_thread import Radio, devs
from flask_socketio import SocketIO, join_room, close_room
from webradio.javadict import toCO

app = Flask(__name__)
app.secret_key = "this is secret"

socketio = SocketIO(app, always_connect=True, ping_timeout=100)

# auth = HTTPBasicAuth()

# @auth.verify_password
# def let_me_in(user,password):
#   return True

_radios = {}

# Serves the Available Radio selection page.
@app.route("/")
# @auth.login_required
def index():
    radios = devs()
    return render_template("index.html", radioList=radios, indexs=range(len(radios)))


# @app.after_request
# def add_headers(response):
#   response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
#   response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
#   return response

# spit a simple page out to do html development like
# how to size a canvas and put in button boxes.
@app.route("/dev")
def dev_page():
    return render_template("dev.html")


@app.route("/radio/<radio_to_claim>")
# @auth.login_required
def the_radio(radio_to_claim):
    return render_template("dev.html", myRadio=radio_to_claim)


@socketio.on("hardware")
def on_hardware(junk):
    global _radios
    radio = _radios.get(request.sid)
    if radio:
        return radio.hardware


@socketio.on("data-ready")
def ready_data(sid):
    radio = _radios.get(sid)
    if radio:
        socketio.emit("data", radio.getData(), to=sid)


@socketio.on("status")
def status_on(sid):
    radio = _radios.get(sid)
    if radio:
        socketio.emit("status", radio.getStatus(), to=sid)


@socketio.on("apply")
def on_apply(co):
    global _radios
    radio = _radios.get(request.sid)
    if radio:
        co = toCO(co)
        radio.apply(co)


# Page sends radio index into the devs list to claim. Using a socket.io event
# allows us to assign the radio to the sid which is a unique socket connected
# to the client. This enforces a one radio one user protocol while allowing
# multiple radios to be served.
#
# The return value is the initial radio status (with current settings) adorned
# with the hardware structure with options for bandwidths, sampling rates etc.
# This initial status will be fed to the onRadioOpen function which will fill
# in all the controles along with their initial values.
@socketio.on("claim")
def claim_radio(indx, audio_sr):
    global _radios
    available = devs()
    sid = request.sid
    try:
        _radios[sid] = Radio(available[int(indx)], int(audio_sr))
        _radios[sid].sid = sid
        _radios[sid].start()
        join_room(sid)
        print(f"radio {_radios[sid].hardware.key} opened")
    except:
        print("radio open failed")
        return "fail"
    stat = _radios[sid].radioStatus()
    stat["hardware"] = _radios[sid].hardware
    return stat


@socketio.on("close")
def close_radio():
    print("closing radio")
    sid = request.sid
    radio = _radios.get(sid)
    if radio:
        close_room(sid)
        key = radio.hardware.key
        radio.stop()
        radio.close()
        _radios.pop(sid)
        print(f"{key} released")
    return "ok"


@socketio.on("connect")
def on_connect():
    print("connected")


@socketio.on("disconnect")
def on_disconnect():
    print("disconnecting")
    radio = _radios.get(request.sid)
    if radio:
        key = radio.hardware.key
        print("stopping radio")
        radio.stop()
        print("closing radio")
        radio.close()
        _radios.pop(request.sid)
        print(f"radio {key} closed")
    print("disconnected")


def start():
    print("starting webradio server")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=True)
    for radio in _radios.values():
        radio.stop()


@app.route("/pid")
def get_pid():
    return str(getpid())


if __name__ == "__main__":
    start()


def get_app():
    return app
