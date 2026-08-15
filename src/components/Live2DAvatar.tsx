useEffect(() => {
  isDestroyedRef.current = false;

  let pixiApp: any = null;
  let animFrameId = 0;

  const initLive2D = async () => {
    try {
      setLoading(true);
      setLoadingError(null);

      /*
       * IMPORTANT
       * -----------------------------------------
       * ใช้ Pixi + pixi-live2d-display จาก npm
       * และไม่ override Live2DLoader.middleware
       */

      const PIXI = await import("pixi.js");

      if (isDestroyedRef.current) return;

      // ให้ pixi-live2d-display มองเห็น PIXI
      (window as any).PIXI = PIXI;

      /*
       * โหลด Cubism Core ก่อน
       */
      if (!(window as any).Live2DCubismCore) {
        let script = document.querySelector(
          'script[src*="live2dcubismcore"]'
        ) as HTMLScriptElement | null;

        if (!script) {
          script = document.createElement("script");
          script.src =
            "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
          script.async = false;

          document.head.appendChild(script);
        }

        let attempts = 0;

        while (
          !(window as any).Live2DCubismCore &&
          attempts < 100
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, 100)
          );

          attempts++;
        }
      }

      if (!(window as any).Live2DCubismCore) {
        throw new Error(
          "Live2DCubismCore failed to load"
        );
      }

      if (isDestroyedRef.current) return;

      /*
       * Import Cubism 4 adapter
       */
      const {
        Live2DModel,
      } = await import(
        "pixi-live2d-display/cubism4"
      );

      if (isDestroyedRef.current) return;

      /*
       * Register Pixi ticker
       */
      Live2DModel.registerTicker(PIXI.Ticker);

      /*
       * Canvas / container
       */
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (!canvas || !container) {
        throw new Error(
          "Live2D canvas/container not found"
        );
      }

      const rect =
        container.getBoundingClientRect();

      const appWidth =
        Math.max(1, Math.floor(rect.width || width));

      const appHeight =
        Math.max(1, Math.floor(rect.height || height));

      /*
       * PIXI Application
       */
      pixiApp = new PIXI.Application({
        view: canvas,
        width: appWidth,
        height: appHeight,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution:
          Math.min(window.devicePixelRatio || 1, 2),
      });

      appRef.current = pixiApp;

      /*
       * IMPORTANT:
       *
       * ใช้ URL ของ model.json โดยตรง
       * ไม่ใช้ custom middleware
       *
       * ให้ pixi-live2d-display จัดการ:
       *   model3.json
       *   moc3
       *   physics3.json
       *   textures
       *   expressions
       */
      const modelUrl = resolveAssetUrl(
        "live2d/MassageSeacubus_rei.model3.json"
      );

      console.log(
        "[Live2D] Model URL:",
        modelUrl
      );

      /*
       * ตรวจสอบ model.json ก่อน
       */
      const modelResponse = await fetch(
        modelUrl,
        {
          cache: "no-cache",
        }
      );

      if (!modelResponse.ok) {
        throw new Error(
          `Model JSON HTTP ${modelResponse.status}: ${modelUrl}`
        );
      }

      const modelJson =
        await modelResponse.json();

      if (
        !modelJson ||
        typeof modelJson !== "object"
      ) {
        throw new Error(
          "Invalid model3.json"
        );
      }

      console.log(
        "[Live2D] model3.json OK"
      );

      /*
       * โหลดโมเดล
       */
      const model =
        await Live2DModel.from(
          modelUrl,
          {
            autoInteract: false,
          }
        );

      if (!model) {
        throw new Error(
          "Live2DModel.from() returned null"
        );
      }

      if (isDestroyedRef.current) {
        try {
          model.destroy();
        } catch {}

        return;
      }

      modelRef.current = model;

      /*
       * Add model to stage
       */
      pixiApp.stage.addChild(model);

      /*
       * Calculate scale
       */
      const modelWidth =
        model.width || 1;

      const modelHeight =
        model.height || 1;

      const scale =
        Math.min(
          appWidth / modelWidth,
          appHeight / modelHeight
        ) * 0.92;

      model.scale.set(scale);

      /*
       * Center model
       */
      model.anchor.set(0.5, 0.5);

      model.position.set(
        appWidth / 2,
        appHeight * 0.55
      );

      /*
       * -----------------------------------------
       * Mouse / eye animation
       * -----------------------------------------
       */

      let lastBlinkTime =
        performance.now();

      let nextBlinkInterval =
        3000 + Math.random() * 2500;

      let isBlinking = false;

      const blinkDuration = 150;

      const updateModelParams = () => {
        if (
          isDestroyedRef.current ||
          !modelRef.current
        ) {
          return;
        }

        const now =
          performance.now();

        const internal =
          modelRef.current.internalModel;

        const core =
          internal?.coreModel;

        if (!core) {
          animFrameId =
            requestAnimationFrame(
              updateModelParams
            );

          return;
        }

        /*
         * Smooth mouse movement
         */
        const pos =
          targetPosRef.current;

        pos.x +=
          (pos.targetX - pos.x) *
          0.10;

        pos.y +=
          (pos.targetY - pos.y) *
          0.10;

        const mx = pos.x;
        const my = pos.y;

        /*
         * Head
         */
        core.setParameterValueById(
          "ParamAngleX",
          mx * 28
        );

        core.setParameterValueById(
          "ParamAngleY",
          -my * 24
        );

        core.setParameterValueById(
          "ParamAngleZ",
          mx * my * -12
        );

        /*
         * Eyes
         */
        core.setParameterValueById(
          "ParamEyeBallX",
          mx
        );

        core.setParameterValueById(
          "ParamEyeBallY",
          -my
        );

        /*
         * Body
         */
        core.setParameterValueById(
          "ParamBodyAngleX",
          mx * 8
        );

        /*
         * Breathing
         */
        const breath =
          (Math.sin(now * 0.0018) + 1) /
          2;

        core.setParameterValueById(
          "ParamBreath",
          breath
        );

        /*
         * Blink
         */
        if (
          !isBlinking &&
          now - lastBlinkTime >
            nextBlinkInterval
        ) {
          isBlinking = true;
          lastBlinkTime = now;
        }

        if (isBlinking) {
          const elapsed =
            now - lastBlinkTime;

          if (elapsed < blinkDuration) {
            const progress =
              elapsed /
              blinkDuration;

            const eyeOpen =
              progress < 0.5
                ? 1 - progress * 2
                : (progress - 0.5) * 2;

            core.setParameterValueById(
              "ParamEyeLOpen",
              eyeOpen
            );

            core.setParameterValueById(
              "ParamEyeROpen",
              eyeOpen
            );
          } else {
            isBlinking = false;

            lastBlinkTime = now;

            nextBlinkInterval =
              2500 +
              Math.random() * 3500;

            core.setParameterValueById(
              "ParamEyeLOpen",
              1
            );

            core.setParameterValueById(
              "ParamEyeROpen",
              1
            );
          }
        }

        animFrameId =
          requestAnimationFrame(
            updateModelParams
          );
      };

      animFrameId =
        requestAnimationFrame(
          updateModelParams
        );

      /*
       * Resize
       */
      const resizeObserver =
        new ResizeObserver(() => {
          if (
            !pixiApp ||
            !modelRef.current ||
            !containerRef.current
          ) {
            return;
          }

          const r =
            containerRef.current.getBoundingClientRect();

          const w =
            Math.max(
              1,
              Math.floor(r.width)
            );

          const h =
            Math.max(
              1,
              Math.floor(r.height)
            );

          pixiApp.renderer.resize(
            w,
            h
          );

          const sc =
            Math.min(
              w / (model.width || 1),
              h / (model.height || 1)
            ) * 0.92;

          model.scale.set(sc);

          model.position.set(
            w / 2,
            h * 0.55
          );
        });

      resizeObserver.observe(
        container
      );

      /*
       * Store observer for cleanup
       */
      (pixiApp as any).__live2dResizeObserver =
        resizeObserver;

      setLoading(false);

      onLoaded?.();

      console.log(
        "[Live2D] Loaded successfully"
      );

    } catch (err: any) {
      console.error(
        "Live2D initialization error:",
        err
      );

      setLoadingError(
        err?.message ||
          "Failed to load Live2D model"
      );

      setLoading(false);
    }
  };

  initLive2D();

  return () => {
    isDestroyedRef.current = true;

    cancelAnimationFrame(
      animFrameId
    );

    /*
     * Remove ResizeObserver
     */
    if (pixiApp?.__live2dResizeObserver) {
      try {
        pixiApp.__live2dResizeObserver.disconnect();
      } catch {}
    }

    /*
     * Destroy model
     */
    if (modelRef.current) {
      try {
        modelRef.current.destroy({
          children: true,
        });
      } catch {}

      modelRef.current = null;
    }

    /*
     * Destroy Pixi
     */
    if (pixiApp) {
      try {
        pixiApp.destroy(
          true,
          {
            children: true,
            texture: true,
          }
        );
      } catch {}

      pixiApp = null;
    }

    appRef.current = null;
  };
}, [width, height, onLoaded]);
