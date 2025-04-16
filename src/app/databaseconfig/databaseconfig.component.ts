import { Component, type OnInit } from "@angular/core"
import {  FormBuilder,  FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { CommonModule } from "@angular/common"
import { HttpClientModule } from "@angular/common/http"
import  { Router } from "@angular/router"
import  { DatabaseConfigService } from "../services/database-config.service"
import  { MySQLProxyService } from "../services/MySQLProxyService .service"
import  { AppConfigService } from "../services/AppConfigService .service"

@Component({
  selector: "app-databaseconfig",
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: "./databaseconfig.component.html",
  styleUrls: ["./databaseconfig.component.scss"],
})
export class DatabaseconfigComponent implements OnInit {
  [x: string]: any
  dbConfigForm!: FormGroup
  appConfigForm!: FormGroup
  isLoading = false
  isError = false
  message = ""
  appMessage = ""
  isAppError = false
  isAppLoading = false
  isTestingConnection = false
  isAppTestingConnection = false
  activeConfigType: "database" | "application" = "database"
  connectionStatus: "idle" | "connecting" | "connected" | "failed" = "idle"

  appTypes = [{ name: "REST API" }, { name: "WebApp" }, { name: "Node.js App" }, { name: "Microservice" }]

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private databaseConfigService: DatabaseConfigService,
    private proxyService: MySQLProxyService,
    private appConfigService: AppConfigService,
  ) {}

  ngOnInit(): void {
    this.initDbForm()
    this.initAppForm()
    this.loadProxyConfig()

    // Initialize connection status
    this.connectionStatus = "idle"
  }

  setActiveConfigType(type: "database" | "application") {
    this.activeConfigType = type
  }

  initDbForm() {
    this.dbConfigForm = this.fb.group({
      databaseType: ["mysql", Validators.required],
      host: ["localhost", Validators.required],
      port: ["3306", [Validators.required, Validators.min(1), Validators.max(65535), Validators.pattern("^[0-9]+$")]],
      databaseName: ["", Validators.required],
      useCustomUrl: [false],
      customUrl: [""],
      username: ["", Validators.required],
      password: ["", Validators.required],
      generatedUrl: [""],
      useProxy: [false],
      proxyHost: ["localhost", Validators.required],
      proxyPort: ["3306", [Validators.required, Validators.min(1), Validators.max(65535)]],
    })

    this.dbConfigForm.get("useCustomUrl")?.valueChanges.subscribe((useCustom) => {
      const customUrl = this.dbConfigForm.get("customUrl")
      const host = this.dbConfigForm.get("host")
      const port = this.dbConfigForm.get("port")
      const dbName = this.dbConfigForm.get("databaseName")

      if (useCustom) {
        customUrl?.setValidators([Validators.required])
        host?.clearValidators()
        port?.clearValidators()
        dbName?.clearValidators()
      } else {
        customUrl?.clearValidators()
        host?.setValidators([Validators.required])
        port?.setValidators([Validators.required, Validators.min(1), Validators.max(65535)])
        dbName?.setValidators([Validators.required])
      }

      customUrl?.updateValueAndValidity()
      host?.updateValueAndValidity()
      port?.updateValueAndValidity()
      dbName?.updateValueAndValidity()
    })

    this.dbConfigForm.valueChanges.subscribe((val) => {
      if (!val.useCustomUrl) {
        const url = `jdbc:${val.databaseType}://${val.host}:${val.port}/${val.databaseName}`
        this.dbConfigForm.get("generatedUrl")?.setValue(url, { emitEvent: false })
      }
    })
  }
  initAppForm() {
    this.appConfigForm = this.fb.group({
      applicationType: ["REST API", Validators.required],
      appHost: ["localhost", Validators.required],
      appPort: ["8080", [Validators.required, Validators.min(1), Validators.max(65535)]],
      appName: ["", Validators.required],
      useCustomEndpoint: [false],
      customEndpoint: [""],
      appUsername: ["", Validators.required],
      appPassword: ["", Validators.required],
      apiPath: ["", Validators.required], // Added API path field
      healthEndpoint: ["/actuator/health"], // Added health endpoint for connection testing
      authType: ["None"], // Added authentication type
      generatedEndpoint: [""],
      useAppProxy: [false],
      appProxyHost: ["localhost", Validators.required],
      appProxyPort: ["3303", [Validators.required, Validators.min(1), Validators.max(65535)]], // Updated to 3303
    });
  
    this.appConfigForm.valueChanges.subscribe((val: { useCustomEndpoint: any; appHost: any; appPort: any; apiPath: string }) => {
      if (!val.useCustomEndpoint) {
        let url = `http://${val.appHost}:${val.appPort}`;
        if (val.apiPath) {
          if (!val.apiPath.startsWith("/")) {
            url += "/";
          }
          url += val.apiPath;
        }
        this.appConfigForm.get("generatedEndpoint")?.setValue(url, { emitEvent: false });
      }
    });
  }
  
  onAppSubmit() {
    if (this.appConfigForm.valid) {
      this.isAppLoading = true;
      this.connectionStatus = "connecting";
      const payload = this.buildAppPayload();
  
      this.appConfigService.saveAppConfig(payload).subscribe({
        next: () => {
          this.appMessage = "Application config saved!";
          this.isAppError = false;
          if (payload.useAppProxy) {
            this.testAppProxyConnection();
          } else {
            this.isAppLoading = false;
            this.connectionStatus = "connected";
          }
        },
        error: (err) => {
          this.appMessage = "Failed to save application config: " + err.message;
          this.isAppError = true;
          this.isAppLoading = false;
          this.connectionStatus = "failed";
        },
      });
    }
  }
  

  buildDbPayload() {
    const val = this.dbConfigForm.value
    return {
      databaseType: val.databaseType,
      host: val.host,
      port: val.port,
      databaseName: val.databaseName,
      useCustomUrl: val.useCustomUrl,
      customUrl: val.customUrl,
      username: val.username,
      password: val.password,
      jdbcUrl: val.useCustomUrl ? val.customUrl : val.generatedUrl,
      useProxy: val.useProxy,
      proxyHost: val.proxyHost,
      proxyPort: val.proxyPort,
    }
  }

  buildAppPayload() {
    const val = this.appConfigForm.value
    return {
      applicationType: val.applicationType,
      host: val.appHost,
      port: val.appPort,
      appName: val.appName,
      username: val.appUsername,
      password: val.appPassword,
      endpoint: val.useCustomEndpoint ? val.customEndpoint : val.generatedEndpoint,
      useAppProxy: val.useAppProxy,
      proxyHost: val.appProxyHost,
      proxyPort: val.appProxyPort,
    }
  }

  testAppConnection() {
    if (this.appConfigForm.valid) {
      const payload = this.buildAppPayload()
      this.isAppLoading = true
      this.connectionStatus = "connecting"

      this.appConfigService.testAppConnection(payload).subscribe({
        next: (response) => {
          console.log("App connection test successful:", response)
          this.appMessage = "App connection successful!"
          this.isAppError = false
          this.isAppLoading = false
          this.connectionStatus = "connected"

          // Store connection info in localStorage for persistence
          localStorage.setItem(
            "lastSuccessfulConnection",
            JSON.stringify({
              host: payload.host,
              port: payload.port,
              appName: payload.appName,
              timestamp: new Date().toISOString(),
            }),
          )

          this.showConnectionNotification(true)
        },
        error: (err) => {
          console.error("App connection test failed:", err)
          this.appMessage = "App connection failed: " + err.message
          this.isAppError = true
          this.isAppLoading = false
          this.connectionStatus = "failed"

          this.showConnectionNotification(false)
        },
      })
    }
  }

  testAppProxyConnection() {
    const val = this.appConfigForm.value

    // Fix: Use the application host and port as target, not the proxy host/port
    const config = {
      targetHost: val.appHost, // Target is the actual application
      targetPort: val.appPort, // Application port (8080)
      proxyPort: "3303", // Fixed proxy port for ApplicationProxy
    }

    console.log("Sending testAppProxyConnection request with config:", config)
    this.isAppTestingConnection = true
    this.connectionStatus = "connecting"

    this.appConfigService.testAppProxyConnection(config).subscribe({
      next: (response) => {
        console.log("Proxy test successful:", response)
        this.appMessage =
          "Proxy test successful! Your application is now accessible through the proxy at localhost:3303"
        this.isAppError = false
        this.isAppTestingConnection = false
        this.connectionStatus = "connected"

        // Show success notification
        this.showConnectionNotification(true)
      },
      error: (err) => {
        console.error("Proxy test failed:", err)
        this.appMessage = "Proxy test failed: " + err.message
        this.isAppError = true
        this.isAppTestingConnection = false
        this.connectionStatus = "failed"

        // Show failure notification
        this.showConnectionNotification(false)
      },
    })
  }

  // Add notification method
  showConnectionNotification(success: boolean) {
    // Create a notification element
    const notification = document.createElement("div")
    notification.style.position = "fixed"
    notification.style.top = "20px"
    notification.style.right = "20px"
    notification.style.padding = "15px 20px"
    notification.style.borderRadius = "5px"
    notification.style.zIndex = "9999"
    notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)"
    notification.style.transition = "all 0.3s ease"

    if (success) {
      notification.style.backgroundColor = "#4CAF50"
      notification.style.color = "white"
      notification.textContent = "Successfully connected to application!"
    } else {
      notification.style.backgroundColor = "#F44336"
      notification.style.color = "white"
      notification.textContent = "Failed to connect to application!"
    }

    document.body.appendChild(notification)

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = "0"
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 5000)
  }

  stopAppProxy() {
    this.appConfigService.stopAppProxy().subscribe({
      next: () => {
        this.appMessage = "App Proxy stopped."
        this.appConfigForm.patchValue({ useAppProxy: false })
        this.connectionStatus = "idle"
      },
      error: (err) => {
        this.appMessage = "Failed to stop proxy: " + err.message
        this.isAppError = true
      },
    })
  }

  dbTypes = [
    { name: "mysql", port: 3306 },
    { name: "postgresql", port: 5432 },
    { name: "mariadb", port: 3306 },
    { name: "oracle", port: 1521 },
    { name: "sqlserver", port: 1433 },
    { name: "mongodb", port: 27017 },
    { name: "sqlite", port: null },
    { name: "redis", port: 6379 },
    { name: "cassandra", port: 9042 },
    { name: "cockroachdb", port: 26257 },
    { name: "elasticsearch", port: 9200 },
    { name: "dynamodb", port: 8000 },
  ]

  loadProxyConfig() {
    this.proxyService.getProxyConfig().subscribe({
      next: (config) => {
        if (config) {
          this.dbConfigForm.patchValue({
            proxyHost: config.host,
            proxyPort: config.port,
          })
        }
      },
      error: (err) => {
        console.error("Failed to load proxy config:", err)
      },
    })

    // Also check if proxy is running
    this.proxyService.getProxyStatus().subscribe({
      next: (status) => {
        if (status && status.running) {
          this.dbConfigForm.patchValue({
            useProxy: true,
          })
        }
      },
      error: (err) => {
        console.error("Failed to get proxy status:", err)
      },
    })
  }

  onSubmit() {
    if (this.dbConfigForm.valid) {
      this.isLoading = true
      const payload = this.buildPayload()

      console.log("Submitting configuration:", payload)

      this.databaseConfigService.saveConfig(payload).subscribe({
        next: (response) => {
          console.log("Configuration saved successfully:", response)
          this.message = "Configuration saved successfully!"
          this.isError = false
          this.isLoading = false

          // Save Proxy Config if enabled
          if (payload.useProxy) {
            // First test the connection
            this.testProxyConnection(payload.proxyHost, Number.parseInt(String(payload.proxyPort), 10), true)
          }
        },
        error: (err) => {
          console.error("Error saving configuration:", err)
          this.message = "Error: " + (err.error?.message || err.message || "Unknown error")
          this.isError = true
          this.isLoading = false
        },
      })
    } else {
      this.markFormGroupTouched(this.dbConfigForm)
      this.message = "Please fix the form errors before submitting."
      this.isError = true
    }
  }

  testProxyConnection(host: string, port: number | string, saveAfterTest = false) {
    this.isTestingConnection = true
    this.message = "Testing connection to database..."
    this.isError = false

    // Create a simple object with just the host and port
    const proxyConfig = {
      host: host,
      port: typeof port === "string" ? Number.parseInt(port, 10) : port,
    }

    // Use direct JSON string to avoid any potential issues with object serialization
    const jsonPayload = JSON.stringify(proxyConfig)
    console.log("Testing proxy connection with JSON payload:", jsonPayload)

    this.proxyService.testConnection(proxyConfig).subscribe({
      next: (response) => {
        console.log("Connection test successful:", response)
        this.message = "Connection successful! Database is reachable."
        this.isError = false

        if (saveAfterTest) {
          this.saveProxyConfig(proxyConfig)
        } else {
          this.isTestingConnection = false
        }
      },
      error: (err) => {
        console.error("Connection test failed:", err)
        // Extract the error message from the response if available
        let errorMessage = "Database is not reachable"

        if (err.error && typeof err.error === "string") {
          errorMessage = err.error
        } else if (err.error && err.error.message) {
          errorMessage = err.error.message
        } else if (err.message) {
          errorMessage = err.message
        }

        this.message = "Connection failed: " + errorMessage
        this.isError = true
        this.isTestingConnection = false
        this.isLoading = false
      },
    })
  }

  saveProxyConfig(config: any) {
    this.proxyService.saveProxyConfig(config).subscribe({
      next: (response) => {
        console.log("Proxy config saved:", response)

        // If proxy is enabled, start it
        if (this.dbConfigForm.get("useProxy")?.value) {
          this.startProxy()
        } else {
          this.isLoading = false
          this.isTestingConnection = false
        }
      },
      error: (err) => {
        console.error("Failed to save proxy config:", err)
        this.message = "Failed to save proxy config: " + (err.error || err.message || "Unknown error")
        this.isError = true
        this.isLoading = false
        this.isTestingConnection = false
      },
    })
  }

  startProxy() {
    console.log("Starting proxy...")
    this.proxyService.startProxy().subscribe({
      next: (response) => {
        console.log("Proxy started:", response)
        this.message = "Proxy started successfully!"
        this.isError = false
        this.isLoading = false
        this.isTestingConnection = false
      },
      error: (err) => {
        console.error("Failed to start proxy:", err)
        let errorMessage = "Unknown error"

        if (err.error && typeof err.error === "string") {
          errorMessage = err.error
        } else if (err.error && err.error.message) {
          errorMessage = err.error.message
        } else if (err.message) {
          errorMessage = err.message
        }

        this.message = "Failed to start proxy: " + errorMessage
        this.isError = true
        this.isLoading = false
        this.isTestingConnection = false
      },
    })
  }

  testConnection() {
    if (this.dbConfigForm.valid) {
      this.isLoading = true
      const payload = this.buildPayload()

      console.log("Testing connection with:", payload)

      this.databaseConfigService.testConnection(payload).subscribe({
        next: (response) => {
          console.log("Connection test successful:", response)
          this.message = "Connection successful! Configuration stored."
          this.isError = false
          this.isLoading = false
          this.router.navigate(["/SCENARIOS"]) // Navigate to /SCENARIOS on success
        },
        error: (err) => {
          console.error("Connection test failed:", err)
          this.message = "Connection failed: " + (err.error?.message || err.message || "Unknown error")
          this.isError = true
          this.isLoading = false
        },
      })
    } else {
      this.markFormGroupTouched(this.dbConfigForm)
    }
  }

  testProxyConnectionOnly() {
    const proxyHost = this.dbConfigForm.get("proxyHost")?.value
    const proxyPort = this.dbConfigForm.get("proxyPort")?.value

    if (!proxyHost || !proxyPort) {
      this.message = "Please enter proxy host and port first."
      this.isError = true
      return
    }

    console.log(`Testing connection to ${proxyHost}:${proxyPort}`)
    this.testProxyConnection(proxyHost, proxyPort)
  }

  stopProxy() {
    this.isLoading = true
    this.proxyService.stopProxy().subscribe({
      next: (response) => {
        console.log("Proxy stopped:", response)
        this.message = "Proxy stopped successfully."
        this.isError = false
        this.isLoading = false
        this.dbConfigForm.patchValue({
          useProxy: false,
        })
      },
      error: (err) => {
        console.error("Failed to stop proxy:", err)
        let errorMessage = "Unknown error"

        if (err.error && typeof err.error === "string") {
          errorMessage = err.error
        } else if (err.error && err.error.message) {
          errorMessage = err.error.message
        } else if (err.message) {
          errorMessage = err.message
        }

        this.message = "Failed to stop proxy: " + errorMessage
        this.isError = true
        this.isLoading = false
      },
    })
  }

  private buildPayload() {
    const form = this.dbConfigForm.value
    const payload: any = {
      databaseType: form.databaseType,
      host: form.host,
      port: form.port,
      databaseName: form.databaseName,
      useCustomUrl: form.useCustomUrl,
      customUrl: form.customUrl,
      username: form.username,
      password: form.password,
      jdbcUrl: form.useCustomUrl ? form.customUrl : this.dbConfigForm.get("generatedUrl")?.value,
      useProxy: form.useProxy,
      proxyHost: form.proxyHost,
      proxyPort: form.proxyPort,
    }

    return payload
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched()
      if ((control as FormGroup).controls) {
        this.markFormGroupTouched(control as FormGroup)
      }
    })
  }
}
