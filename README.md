# Sistema de Votação Escolar — Saber+ & It's Play

Versão responsiva com seleção de fotos otimizada para celular.

## Cadastro de fotos no celular

Na área **Professoras > Candidatos**, toque em **Escolher foto**. O sistema abre o seletor nativo do aparelho para escolher uma imagem da **galeria** ou do **gerenciador de arquivos**. A versão anterior usava `capture="environment"`, atributo que em muitos celulares priorizava/forçava a câmera; ele foi removido.

Antes de salvar, o app mostra uma prévia da foto e permite removê-la ou escolher outra. A imagem é reduzida e compactada no próprio navegador para economizar armazenamento local e melhorar o funcionamento em celulares.

Formatos esperados: JPG/JPEG, PNG, WEBP e, quando o navegador do aparelho oferecer suporte, HEIC/HEIF. Arquivos de até 20 MB podem ser selecionados; a cópia gravada no app é otimizada.

## Observação sobre armazenamento

Esta versão continua funcionando sem servidor: candidatos, votos e imagens ficam armazenados no navegador do dispositivo. Para uso simultâneo em vários celulares/tablets com uma base única compartilhada, é necessário conectar o app a um banco de dados online.
