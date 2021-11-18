from threading import Lock


class Fifo:
    def __init__(self, maxn=None):
        self.lock = Lock()
        self.elem = []
        self.maxn = maxn

    def not_empty(self):
        self.lock.acquire()
        ret = len(self.elem) > 0
        self.lock.release()
        return ret

    def get(self):
        self.lock.acquire()
        ret = None
        if len(self.elem) > 0:
            ret = self.elem[0]
            self.elem = self.elem[1:]
        self.lock.release()
        return ret

    def put(self, elem):
        self.lock.acquire()
        if not self.maxn:
            self.elem.append(elem)
        else:
            while len(self.elem) >= self.maxn:
                self.elem = self.elem[1:]
            self.elem.append(elem)
        self.lock.release()
