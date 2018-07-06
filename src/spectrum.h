#pragma once
#include <vector>
#include <algorithm>
#include <fftw3.h>
#include <complex>

typedef std::complex<double> cplxT;
typedef std::vector<cplxT>   cplxV;

struct Spectrum : cplxV
{
  Spectrum(int N) {
    resize(N);
    for (int n = 0; n < N; n++)
      at(n) = cplxT(0.0,0.0);
  }
  Spectrum() {}
  void init(fftw_complex *sp, int N) {
    resize(N);
    for (int n = 0; n < N; n++) {
      at(n) = cplxT(sp[n][0],sp[n][1]);
    }
  }
  // collect and return nf peaks
  int peak();
};

struct FFT
{
  fftw_complex *in;
  fftw_complex *out;
  fftw_plan     plan;
  int           N;
  FFT(int ns, int dir=FFTW_FORWARD);
  ~FFT();
  Spectrum spectrum();
  void fixorder();
};
