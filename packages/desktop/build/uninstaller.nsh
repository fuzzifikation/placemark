; Custom NSIS script for Placemark uninstaller
; Adds optional checkbox to delete user data during uninstall

!macro customUnInstall
  ; Check if user wants to delete data
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove all Placemark user data?$\n$\nThis includes:$\n  • Photo database (placemark.db)$\n  • Thumbnail cache (thumbnails.db)$\n  • Application settings$\n$\nThis action cannot be undone." /SD IDNO IDYES removeData IDNO keepData

  removeData:
    ; Get the AppData Roaming path
    ReadEnvStr $0 APPDATA
    ; Delete Placemark data directory
    RMDir /r "$0\@placemark\desktop"
    DetailPrint "Removed user data from: $0\@placemark\desktop"
    Goto done

  keepData:
    DetailPrint "User data kept in: $0\@placemark\desktop"
    Goto done

  done:
!macroend
