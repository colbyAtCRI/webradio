#include "spectrum.h"

FFT::FFT(int ns, int dir) : N(ns)
{
  in   = (fftw_complex*)fftw_malloc(N * sizeof(fftw_complex));
  out  = (fftw_complex*)fftw_malloc(N * sizeof(fftw_complex));
  plan = fftw_plan_dft_1d(N,in,out,dir,FFTW_ESTIMATE);
}

FFT::~FFT()
{
  fftw_destroy_plan(plan);
  fftw_free(in);
  fftw_free(out);
}

void FFT::fixorder()
{
  for (int n = 0; n < N/2; n++) {
    fftw_complex tmp;
    tmp[0] = out[N/2+n][0];
    tmp[1] = out[N/2+n][1];
    out[N/2+n][0] = out[n][0];
    out[N/2+n][1] = out[n][1];
    out[n][0] = tmp[0];
    out[n][1] = tmp[1];
  }
}

Spectrum FFT::spectrum()
{
  Spectrum ret;
  fftw_execute(plan);
  fixorder();
  ret.init(out,N);
  return ret;
}

// Man, at times like these I pine for FORTRAN
double cabs(cplxT z)
{
   return sqrt(z.real()*z.real()+z.imag()*z.imag());
}

int Spectrum::peak()
{
  double maxmag(0.0);
  int    indx(0);
  for (int n = 0; n < size(); n++) {
    if (cabs(at(n)) > maxmag) {
      maxmag = cabs(at(n));
      indx   = n;
    }
  }
  return indx;
}
