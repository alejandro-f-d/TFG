import torch
import time
import sys

def estres_vram_progresivo():

    if not torch.cuda.is_available():
        print("Error: CUDA no está disponible en este contenedor Docker.")
        return

    device = torch.device("cuda")
    gpu_name = torch.cuda.get_device_name(0)
    
    t = torch.cuda.get_device_properties(device).total_memory
    total_vram_gb = t / 1024**3
    
    print(f"--- Iniciando estrés de VRAM en: {gpu_name} ---")
    print(f"Capacidad total aproximada: {total_vram_gb:.2f} GB")
    print("El código llenará la VRAM hasta que falle (OutOfMemory).")
    print("Monitorea con 'nvidia-smi' en otra terminal.\n")

    bloque_size = 16384 
    lista_de_memoria = []
    
    step = 0
    try:
        while True:
            step += 1
            print(f"[Paso {step}] Intentando asignar un nuevo bloque de ~1GB VRAM...", end="", flush=True)
            
            nuevo_bloque = torch.randn(bloque_size, bloque_size, device=device, dtype=torch.float32)
            
            lista_de_memoria.append(nuevo_bloque)
            
            time.sleep(1.5) 
            print(" [OK]")

    except torch.cuda.OutOfMemoryError:
        print("\n\n!!! ALCANZADO EL LÍMITE DE VRAM (OutOfMemory) !!!")
        
        memoria_asignada = step # Aproximadamente 1GB por step
        print(f"Se han asignado exitosamente ~{memoria_asignada} bloques de 1GB.")
        
    except KeyboardInterrupt:
        print("\nPrueba detenida por el usuario (Ctrl+C).")
        
    finally:
        # Limpieza: liberar las referencias
        print("Liberando memoria asignada...")
        del lista_de_memoria
        torch.cuda.empty_cache()
        print("VRAM liberada.")

if __name__ == "__main__":
    estres_vram_progresivo()