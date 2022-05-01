#!/usr/bin/env python
import os, subprocess
from datetime import datetime
from sys import version, exit
from glob import glob

print(f"\n\tWelcome to the Let's find Soapy utility\n")

print(
    f"Our goal is to locate the SoapySDR python3 support and copy \n"
    f"the needed files to $WEBRADIO_ROOT/webradio/soapy_sdr \n"
    f"where WebRadio will be able to find it.\n "
    f"\nThe first thing to check is if SoapySDR is already where it \n"
    f"needs to be and that it loads.\n"
    f"BTW, you should be running find-soapy.py from $WEBRADIO_ROOT using \n\n"
    f"\t./webradio/find-soapy.py\n\n"
)

junk = input('First, look for SoapySDR.py in python path[ret] ')
inPath = False
try:
    import SoapySDR
    inPath = True
except RuntimeError:
    print("\nSoapy is there but seems to be  broken")
except ModuleNotFoundError:
    print("\nIt's not in the python path")

if inPath:
    exit(0)

junk = input("Next we check if we already have it in webradio.soapy_sdr[ret]")
in_soapy_sdr = False
try:
    from webradio.soapy_sdr import SoapySDR
    in_soapy_sdr = True
except RuntimeError:
    print("\nIt's there but broken")
except ModuleNotFoundError:
    print("\nIt's not there")

if in_soapy_sdr:
    print(
        "Cool, SoapySDR loads and doesn't choke. \n"
        "Looks like you're good to go!!\n"
    )
    exit(1)

soapyInfo = subprocess.check_output(
    'SoapySDRUtil --info',
    shell=True,
    universal_newlines=True).split('\n')

if len(soapyInfo) < 8:
    print(
        "Looks like SoapySDRUtil isn't where we expected\n"
        "Possible things to try:\n"
        "   Install SoapySDR with python support\n"
        "   Make certain SoapySDRUtil is in my run path\n"
        "Good Luck!!"
    )
    exit(1)

w1, w2, root = soapyInfo[7].split()
    

if w1 == 'Install' and w2 == 'root:':
    print()
    print(
        f"Fantastic, we've run SoapyUtil and have it hiding somewhere in {root} \n"
        f"Okay, what happens now is we're going to look everywhere in {root} \n"
        f"for files named, SoapySDR.py. So, if your system is anything like mine, \n"
        f"there are multiple old versions hanging about possibly for long absent \n"
        f"python installs. We need to find the one installed for the python WebRadio \n"
        f"will be using. If you make the wrong choice, no worries. Come back and \n"
        f"we can try again."
    )

files = glob('/usr/local/**/SoapySDR.py',recursive=True)

if len(files) == 0:
    print()
    print(
        f"I looked everywhere in {root} and wasn't able to find\n"
        "the expected SoapySDR.py file. Since SoapySDRUtil was found\n"
        "I suspect that SoapySDR python support was not built")
    exit()
          
            
print(f"found: {len(files)} possibilities which I've sorted newest to oldest")

found = [(datetime.fromtimestamp(os.stat(f).st_ctime),f) for f in files]
found.sort()
found.reverse()
n = 0
for (t,f) in found:
    print(f'[{n}]\t{t}\t{f}')
    n += 1

