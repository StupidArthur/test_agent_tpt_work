require('./check-records.cjs');
const recordExit=process.exitCode||0;
require('./check-code.cjs');
process.exitCode=recordExit||(process.exitCode||0);
