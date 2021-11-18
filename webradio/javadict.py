# This is to free us from the,
#
#     yadyyady['some-annoying-long-name']['with-some-other']
#
# syntax. Also, if an attr is missing, None is returned. This is useful as we
# will only have to update those attrs that need updating. For example,
#
class JavaDict(dict):
    def __getattr__(self, attr):
        return super().get(attr)

    def __setattr__(self, attr, val):
        self[attr] = val

    def not_empty(self):
        return len(self.keys()) > 0


# A ChangeOrder provides a thread safe way to apply configuration changes.
# For example,
#
#   co = ChangeOrder()
#   co.radio.tunerFreq = 120100000
#   co.radio.sampleRate = 192000
#   co.spectrum.length = 1024
#   radio.changeConfig(co)
#
class ChangeOrder(JavaDict):
    def __init__(self):
        super().__init__()
        self.radio = JavaDict()
        self.spectrum = JavaDict()
        self.modem = JavaDict()


def toCO(co):
    ret = JavaDict()
    for (key, value) in co.items():
        if isinstance(value, dict):
            ret[key] = toCO(value)
        else:
            ret[key] = value
    return ret
