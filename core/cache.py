import time
from collections import OrderedDict
from threading import RLock


class ExpiringDict:
    def __init__(self, max_len=100, max_age_seconds=60):
        self.max_len = max_len
        self.max_age_seconds = max_age_seconds
        self.data = OrderedDict()
        self.lock = RLock()

    def _expire(self):
        # This method removes expired items
        current_time = time.time()
        keys_to_delete = []
        for key, (value, timestamp) in self.data.items():
            if current_time - timestamp > self.max_age_seconds:
                keys_to_delete.append(key)
            else:
                break  # Remaining items are still valid

        for key in keys_to_delete:
            del self.data[key]

    def set(self, key, value):
        with self.lock:
            current_time = time.time()
            if key in self.data:
                del self.data[key]
            elif len(self.data) >= self.max_len:
                self.data.popitem(last=False)
            self.data[key] = (value, current_time)
            self._expire()

    def get(self, key, default=None):
        with self.lock:
            self._expire()
            if key in self.data:
                value, timestamp = self.data[key]
                if time.time() - timestamp <= self.max_age_seconds:
                    return value
                else:
                    del self.data[key]
            return default

    def __contains__(self, key):
        with self.lock:
            self._expire()
            return key in self.data

    def __len__(self):
        with self.lock:
            self._expire()
            return len(self.data)

    def keys(self):
        with self.lock:
            self._expire()
            return list(self.data.keys())

    def values(self):
        with self.lock:
            self._expire()
            return [value for value, _ in self.data.values()]

    def items(self):
        with self.lock:
            self._expire()
            return [(key, value) for key, (value, _) in self.data.items()]

    def clear(self):
        with self.lock:
            self.data.clear()

    def __str__(self):
        with self.lock:
            self._expire()
            return str({key: value for key, (value, _) in self.data.items()})

    def __repr__(self):
        return f"ExpiringDict(max_len={self.max_len}, max_age_seconds={self.max_age_seconds})"
