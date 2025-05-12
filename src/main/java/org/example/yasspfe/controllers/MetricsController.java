    private Map<String, Object> getAppScenarioMetrics() {
        Map<String, Object> appMetrics = new HashMap<>();
        long now = System.currentTimeMillis();

        // Get current scenario states
        boolean cpuLoadEnabled = appscenrioservice.isScenarioEnabled("cpu_load");
        boolean highLoadEnabled = appscenrioservice.isScenarioEnabled("high_load");
        boolean return404Enabled = appscenrioservice.isScenarioEnabled("return_404");
        boolean queryBlackholeEnabled = appscenrioservice.isScenarioEnabled("query_blackhole");
        boolean connectionKillEnabled = appscenrioservice.isScenarioEnabled("connection_kill");
        boolean diskFaultEnabled = appscenrioservice.isScenarioEnabled("disk_fault");

        logger.info("Current scenario states - CPU Load: {}, High Load: {}, Return 404: {}, Query Blackhole: {}, Connection Kill: {}, Disk Fault: {}",
                cpuLoadEnabled, highLoadEnabled, return404Enabled, queryBlackholeEnabled, connectionKillEnabled, diskFaultEnabled);

        // Get CPU load metrics
        List<Map<String, Object>> cpuLoad = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("timestamp", now - (9 - i) * 1000); // 1 second intervals

            // Generate realistic values based on scenario status
            double cpuLoadValue = cpuLoadEnabled
                    ? 70 + Math.random() * 25 // 70-95% when enabled
                    : 10 + Math.random() * 20; // 10-30% when disabled

            dataPoint.put("value", cpuLoadValue);
            cpuLoad.add(dataPoint);
        }
        appMetrics.put("cpuLoad", cpuLoad);

        // Get traffic load metrics
        List<Map<String, Object>> trafficLoad = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("timestamp", now - (9 - i) * 1000);

            // Generate realistic values based on scenario status
            double trafficLoadValue = highLoadEnabled
                    ? 800 + Math.random() * 600 // 800-1400 req/s when enabled
                    : 100 + Math.random() * 200; // 100-300 req/s when disabled

            dataPoint.put("value", trafficLoadValue);
            trafficLoad.add(dataPoint);
        }
        appMetrics.put("trafficLoad", trafficLoad);

        // Get response time metrics
        List<Map<String, Object>> responseTime = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("timestamp", now - (9 - i) * 1000);

            // Generate realistic values based on scenario status
            double responseTimeValue = return404Enabled
                    ? 400 + Math.random() * 300 // 400-700ms when enabled
                    : 50 + Math.random() * 100; // 50-150ms when disabled

            dataPoint.put("value", responseTimeValue);
            responseTime.add(dataPoint);
        }
        appMetrics.put("responseTime", responseTime);

        // Get Query Blackhole metrics
        List<Map<String, Object>> queryBlackhole = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("timestamp", now - (9 - i) * 1000);

            // Generate realistic values based on scenario status
            double queryBlackholeValue = queryBlackholeEnabled
                    ? 20 + Math.random() * 50 // 20-70 dropped queries/sec when enabled
                    : 0; // No dropped queries when disabled

            dataPoint.put("value", queryBlackholeValue);
            queryBlackhole.add(dataPoint);
        }
        appMetrics.put("queryBlackhole", queryBlackhole);

        // Get Connection Kill metrics
        List<Map<String, Object>> connectionKill = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("timestamp", now - (9 - i) * 1000);

            // Generate realistic values based on scenario status
            double connectionKillValue = connectionKillEnabled
                    ? 5 + Math.random() * 10 // 5-15 killed connections/min when enabled
                    : 0; // No killed connections when disabled

            dataPoint.put("value", connectionKillValue);
            connectionKill.add(dataPoint);
        }
        appMetrics.put("connectionKill", connectionKill);

        // Get Disk Fault metrics
        List<Map<String, Object>> diskFault = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("timestamp", now - (9 - i) * 1000);

            // Generate realistic values based on scenario status
            double diskFaultValue = diskFaultEnabled
                    ? 10 + Math.random() * 30 // 10-40 rejected writes/sec when enabled
                    : 0; // No rejected writes when disabled

            dataPoint.put("value", diskFaultValue);
            diskFault.add(dataPoint);
        }
        appMetrics.put("diskFault", diskFault);

        // Add scenario states to the response
        Map<String, Boolean> scenarioStates = new HashMap<>();
        scenarioStates.put("cpuLoad", cpuLoadEnabled);
        scenarioStates.put("highLoad", highLoadEnabled);
        scenarioStates.put("return404", return404Enabled);
        scenarioStates.put("queryBlackhole", queryBlackholeEnabled);
        scenarioStates.put("connectionKill", connectionKillEnabled);
        scenarioStates.put("diskFault", diskFaultEnabled);
        appMetrics.put("scenarioStates", scenarioStates);

        return appMetrics;
    } 