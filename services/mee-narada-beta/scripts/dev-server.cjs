// Accept the managed preview launcher's host/strictPort flags and pass Next's supported equivalents.
const {spawn}=require('node:child_process');
const args=process.argv.slice(2).filter(value=>value!=='--strictPort').map(value=>value==='--host'?'--hostname':value.startsWith('--host=')?'--hostname='+value.slice(7):value);
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev',...args],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code??1});
