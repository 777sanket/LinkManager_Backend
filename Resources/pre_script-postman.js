const now = new Date();
now.setMinutes(now.getMinutes() + 5); // Set 1 minute from now
pm.environment.set("expirationTime", now.toISOString());
