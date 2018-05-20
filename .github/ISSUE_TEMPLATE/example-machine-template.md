---
name: Example machine template
about: Replace this machine with your own.  Write in FSL.

---

machine_name     : "Example traffic light";
machine_author   : "John Haugeland <stonecypher@gmail.com>";
machine_license  : MIT;
machine_comment  : "Just a quick example of how these are written";
machine_language : en;
machine_version  : 1.0.0;
fsl_version      : 1.0.0;

start_states     : [Off Red];





Off 'Enable' -> Red;

Red 'Proceed' => Green 'Proceed' => Yellow 'Proceed' => Red;

[Red Yellow Green] ~> Off;
