#pragma once
#include <json/json.h>
#include <set>

using namespace std;
using namespace Json;

class JConfig : public Value
{
  Value        mLast;
  Value        mChanges;
  set<string>  mProtect;
  int   merge(Value from, Value &to);
  void  markChanges(Value now, Value then, Value &changes);
  void  syncValue();
  bool  isProtedted(string key);
public:
  void  protect(string key);
  int   merge(Value from);
  Value changes() { return mChanges; }
};
