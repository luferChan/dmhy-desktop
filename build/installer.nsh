; Override uninstaller filename to avoid non-ASCII characters
!macro customHeader
  !undef UNINSTALL_FILENAME
  !define UNINSTALL_FILENAME "Uninstall.exe"
!macroend
