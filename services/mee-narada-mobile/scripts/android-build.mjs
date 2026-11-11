import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
const windows=process.platform==='win32',command=process.env.MNR_GRADLE_BIN||(windows?'gradlew.bat':'./gradlew');
if(!process.env.ANDROID_HOME&&!process.env.ANDROID_SDK_ROOT&&!existsSync('android/local.properties')){console.error('Set ANDROID_HOME to your Android SDK, then run npm run android:debug again.');process.exit(1)}
const child=spawn(command,['assembleDebug','--console','plain'],{cwd:'android',stdio:'inherit',shell:windows});child.on('error',error=>{console.error(error.message);process.exitCode=1});child.on('exit',code=>process.exitCode=code||0);
