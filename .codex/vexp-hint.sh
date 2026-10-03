#!/bin/bash
# Optional repository hint; remote environments without Vexp continue normally.
command -v vexp-core >/dev/null 2>&1 || exit 0
vexp-core prompt-hint 2>/dev/null
exit 0
