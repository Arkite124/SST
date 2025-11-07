import torch, torchvision, torchaudio

# CUDA 설정됐는지 확인: CPU로 뜰 시,torch 버전 문제 일수 있으므로 버전에 맞는 가이드 따라가야함.

print('torch:', torch.__version__, ' cuda:', torch.version.cuda)
print('vision:', torchvision.__version__)
print('audio:', torchaudio.__version__)
print('cuda available:', torch.cuda.is_available())
print('gpu:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else '-')
