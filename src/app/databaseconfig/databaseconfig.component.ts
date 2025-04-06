import { Component, type OnInit } from "@angular/core"
import {  FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { CommonModule } from "@angular/common"
import { HttpClientModule } from "@angular/common/http"
import { DatabaseConfigService } from "../services/database-config.service"
import { MySQLProxyService } from "../services/MySQLProxyService .service"

@Component({
  selector: "app-databaseconfig",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: "./databaseconfig.component.html",
  styleUrls: ["./databaseconfig.component.scss"],
})
export class DatabaseconfigComponent implements OnInit {
  dbConfigForm!: FormGroup
  isLoading = false
  message = ""
  isError = false
  isTestingConnection = false

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

  constructor(
    private fb: FormBuilder,
    private databaseConfigService: DatabaseConfigService,
    private proxyService: MySQLProxyService,
  ) {}

  ngOnInit(): void {
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
      proxyHost: ["localhost", [Validators.required]],
      proxyPort: [
        "3306",
        [Validators.required, Validators.min(1), Validators.max(65535), Validators.pattern("^[0-9]+$")],
      ],
    })

    this.dbConfigForm.get("useCustomUrl")?.valueChanges.subscribe((useCustom) => {
      const customUrlControl = this.dbConfigForm.get("customUrl")
      const hostControl = this.dbConfigForm.get("host")
      const portControl = this.dbConfigForm.get("port")
      const dbNameControl = this.dbConfigForm.get("databaseName")

      if (useCustom) {
        customUrlControl?.setValidators([Validators.required])
        hostControl?.clearValidators()
        portControl?.clearValidators()
        dbNameControl?.clearValidators()
      } else {
        customUrlControl?.clearValidators()
        hostControl?.setValidators([Validators.required])
        portControl?.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(65535),
          Validators.pattern("^[0-9]+$"),
        ])
        dbNameControl?.setValidators([Validators.required])
      }

      customUrlControl?.updateValueAndValidity()
      hostControl?.updateValueAndValidity()
      portControl?.updateValueAndValidity()
      dbNameControl?.updateValueAndValidity()
    })

    this.dbConfigForm.get("useProxy")?.valueChanges.subscribe((useProxy) => {
      const proxyHostControl = this.dbConfigForm.get("proxyHost")
      const proxyPortControl = this.dbConfigForm.get("proxyPort")

      if (useProxy) {
        proxyHostControl?.setValidators([Validators.required])
        proxyPortControl?.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(65535),
          Validators.pattern("^[0-9]+$"),
        ])
        proxyHostControl?.enable()
        proxyPortControl?.enable()
      } else {
        proxyHostControl?.clearValidators()
        proxyPortControl?.clearValidators()
        proxyHostControl?.disable()
        proxyPortControl?.disable()
      }

      proxyHostControl?.updateValueAndValidity()
      proxyPortControl?.updateValueAndValidity()
    })

    this.dbConfigForm.valueChanges.subscribe((val) => {
      if (!val.useCustomUrl) {
        const url = `jdbc:${val.databaseType}://${val.host}:${val.port}/${val.databaseName}`
        this.dbConfigForm.get("generatedUrl")?.setValue(url, { emitEvent: false })
      }
    })

    // Load current proxy config
    this.loadProxyConfig()
  }

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

