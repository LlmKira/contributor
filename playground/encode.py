parameters = [("encoding", "UTF-8"), ("mode", "r")]
encoding = next((value for name, value in parameters if name == "encoding"), "UTF-8")
print(encoding)
