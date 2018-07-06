#include "jconfig.h"


int JConfig::merge(Value from, Value &to)
{
  int changes(0);
  for (auto key : from.getMemberNames()) {
    if (isProtedted(key))
      continue;
    if (to.isMember(key) && to[key].type() == from[key].type())
      if (from[key].isObject())
        changes += merge(from[key],to[key]);
      else {
        if (from[key] != to[key]) {
          to[key] = from[key];
          changes += 1;
        }
      }
  }
  return changes;
}

void JConfig::syncValue()
{
  mLast = *(Value*)this;
}

void JConfig::markChanges(Value now, Value then, Value &changes)
{
  for (auto key : now.getMemberNames()) {
    if (!then.isMember(key))
      changes[key] = true;
    else if (then[key].type() != now[key].type()) {
      changes[key] = true;
    }
    else if (!then[key].isObject())
      changes[key] =  (then[key] != now[key]);
    else
      markChanges(now[key],then[key],changes[key]);
  }
}

int JConfig::merge(Value from)
{
  syncValue();
  int chg = merge(from,*this);
  mChanges = Value();
  markChanges(*this,mLast,mChanges);
  return chg;
}

void JConfig::protect(string key)
{
  mProtect.insert(key);
}

bool JConfig::isProtedted(string key)
{
  return mProtect.find(key) != mProtect.end();
}
