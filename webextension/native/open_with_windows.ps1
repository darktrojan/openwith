function GetMessage {
	$reader = New-Object System.IO.BinaryReader([System.Console]::OpenStandardInput())
	$messageLength = $reader.ReadInt32()
	$messageBytes = $reader.ReadBytes($messageLength)
	return [System.Text.Encoding]::UTF8.GetString($messageBytes) | ConvertFrom-Json
}

function SendReply {
	param ($reply)
	$replyBytes = [System.Text.Encoding]::UTF8.GetBytes(($reply | ConvertTo-Json))
	$writer = New-Object System.IO.BinaryWriter([System.Console]::OpenStandardOutput())
	$writer.Write($replyBytes.Count)
	$writer.Write($replyBytes)
}

function Install {
	$registry_locations = @{
		chrome='HKCU:\Software\Google\Chrome\NativeMessagingHosts';
		firefox='HKCU:\Software\Mozilla\NativeMessagingHosts'
	}

	$install_path = Split-Path $PSCommandPath -Parent
	$bat_path = (Join-Path $install_path -ChildPath 'open_with.bat')
	New-Item -Force -Path $bat_path -Value (@'
@echo off
call "powershell" -file "
'@ + $PSCommandPath + '"') > $null

	$manifest = @{name='open_with';type='stdio';path=$bat_path;description='Open With native host'}

	foreach ($browser in $registry_locations.Keys) {
		$registry_location = $registry_locations[$browser]
		if (Get-Item (Split-Path $registry_location -Parent)) {
			if (!(Get-Item $registry_location -ErrorAction Ignore)) {
				New-Item $registry_location > $null
			}

			$registry_location = Join-Path $registry_location -ChildPath 'open_with'
			$manifest_location = Join-Path $install_path -ChildPath ('open_with_' + $browser + '.json')
			if (!(Get-Item $registry_location -ErrorAction Ignore)) {
				New-Item $registry_location > $null
			}

			Set-Item -Path $registry_location -Value $manifest_location -Force
			$browser_manifest = $manifest.Clone()
			if ($browser -eq 'firefox') {
				$browser_manifest['allowed_extensions'] = @('openwith@darktrojan.net')
			} else {
				$browser_manifest['allowed_origins'] = @('chrome-extension://cogjlncmljjnjpbgppagklanlcbchlno/')
			}
			New-Item -Force -Path $manifest_location -Value ($browser_manifest | ConvertTo-Json) > $null
		}
	}
}

function FindBrowsers {
	return (Get-ChildItem -Path 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Clients\StartMenuInternet\' |
		Select-Object -Property @{Name='name';Expression={$_.GetValue($null)}}, @{Name='command';Expression={$_.OpenSubKey('shell\open\command').GetValue($null)}})
}

# From https://github.com/FuzzySecurity/PowerShell-Suite
function Invoke-CreateProcess {
	param (
		[Parameter(Mandatory = $True)]
		[string]$Binary,
		[Parameter(Mandatory = $False)]
		[string]$Args=$null,
		[Parameter(Mandatory = $True)]
		[string]$CreationFlags,
		[Parameter(Mandatory = $True)]
		[string]$ShowWindow,
		[Parameter(Mandatory = $True)]
		[string]$StartF
	)

	# Define all the structures for CreateProcess
	Add-Type -TypeDefinition @"
	using System;
	using System.Diagnostics;
	using System.Runtime.InteropServices;

	[StructLayout(LayoutKind.Sequential)]
	public struct PROCESS_INFORMATION
	{
		public IntPtr hProcess; public IntPtr hThread; public uint dwProcessId; public uint dwThreadId;
	}

	[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
	public struct STARTUPINFO
	{
		public uint cb; public string lpReserved; public string lpDesktop; public string lpTitle;
		public uint dwX; public uint dwY; public uint dwXSize; public uint dwYSize; public uint dwXCountChars;
		public uint dwYCountChars; public uint dwFillAttribute; public uint dwFlags; public short wShowWindow;
		public short cbReserved2; public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput;
		public IntPtr hStdError;
	}

	[StructLayout(LayoutKind.Sequential)]
	public struct SECURITY_ATTRIBUTES
	{
		public int length; public IntPtr lpSecurityDescriptor; public bool bInheritHandle;
	}

	public static class Kernel32
	{
		[DllImport("kernel32.dll", SetLastError=true)]
		public static extern bool CreateProcess(
			string lpApplicationName, string lpCommandLine, ref SECURITY_ATTRIBUTES lpProcessAttributes, 
			ref SECURITY_ATTRIBUTES lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags, 
			IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFO lpStartupInfo, 
			out PROCESS_INFORMATION lpProcessInformation);
	}
"@

	# StartupInfo Struct
	$StartupInfo = New-Object STARTUPINFO
	$StartupInfo.dwFlags = $StartF # StartupInfo.dwFlag
	$StartupInfo.wShowWindow = $ShowWindow # StartupInfo.ShowWindow
	$StartupInfo.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($StartupInfo) # Struct Size

	# ProcessInfo Struct
	$ProcessInfo = New-Object PROCESS_INFORMATION

	# SECURITY_ATTRIBUTES Struct (Process & Thread)
	$SecAttr = New-Object SECURITY_ATTRIBUTES
	$SecAttr.Length = [System.Runtime.InteropServices.Marshal]::SizeOf($SecAttr)

	# CreateProcess --> lpCurrentDirectory
	$GetCurrentPath = (Get-Item -Path ".\" -Verbose).FullName

	# Call CreateProcess
	[Kernel32]::CreateProcess($Binary, $Args, [ref] $SecAttr, [ref] $SecAttr, $false, $CreationFlags, [IntPtr]::Zero, $GetCurrentPath, [ref] $StartupInfo, [ref] $ProcessInfo) |out-null

	echo "`nProcess Information:"
	Get-Process -Id $ProcessInfo.dwProcessId |ft
}

if ($args.Length -eq 1) {
	if ($args[0] -eq 'install') {
		Install
		Exit(0)
	} elseif ($args[0] -eq 'find_browsers') {
		FindBrowsers | Format-List
		Exit(0)
	}
}

$message = GetMessage
if ($message -eq 'ping') {
	SendReply @{'version'='7.2.2';'file'=$PSCommandPath}
} elseif ($message -eq 'find') {
	SendReply (FindBrowsers)
} else {
	if ($message.Length -gt 1) {
		$c = $message.Length - 1
		Invoke-CreateProcess -Binary $message[0] -Args ('"' + $message[0] + '" ' + [String]::Join(' ', $message[1..$c])) -CreationFlags 0x01000010 -ShowWindow 1 -StartF 1
	} else {
		Invoke-CreateProcess -Binary $message[0] -CreationFlags 0x01000000 -ShowWindow 1 -StartF 1
	}
	SendReply $null
}
