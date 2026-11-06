import sys
def rep(path, pairs):
    s=open(path).read()
    for a,b in pairs:
        if a not in s: print('MISSING in',path,':',a[:90]); sys.exit(1)
        s=s.replace(a,b)
    open(path,'w').write(s)
